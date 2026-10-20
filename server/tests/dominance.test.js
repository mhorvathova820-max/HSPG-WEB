'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { after, before, describe, test } = require('node:test');
const { createApp, assistantGreeting } = require('../../server');
const { calculateEstimate, validateWeather } = require('../services/estimate');
const { createAuditLogger } = require('../services/auditLogger');
const { buildCampaignDraft } = require('../services/campaignDraft');
const { renderEstimatePdf } = require('../services/pdfExportEngine');
const { ReactivationQueue } = require('../services/reactivationQueue');
const { checkAuditLog, checkDirectory, checkTransparency } = require('../../deploy-orchestrator');
const { createRateLimiter, verifyAdminToken } = require('../services/adminAuth');

const ADMIN_SECRET = 'a-test-only-secret-that-is-long-enough-for-hmac';

function createAdminToken(claimOverrides = {}, secret = ADMIN_SECRET) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const claims = encode({
    iss: 'holub360',
    aud: 'holub360-admin',
    role: 'admin',
    sub: 'test-admin',
    exp: now + 300,
    ...claimOverrides,
  });
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest('base64url');
  return `${header}.${claims}.${signature}`;
}

describe('HOLUB 360 API foundation', () => {
  let directory;
  let server;
  let baseUrl;
  let auditPath;

  before(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'holub360-test-'));
    auditPath = path.join(directory, 'audit.log');
    const app = createApp({
      auditLogger: createAuditLogger(auditPath),
      auditReaderPath: auditPath,
      adminJwtSecret: ADMIN_SECRET,
    });
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(directory, { recursive: true, force: true });
  });

  test('calculates model areas and prices transparently', () => {
    const estimate = calculateEstimate('Stavební 1066');
    assert.equal(estimate.estimateType, 'illustrative-model-not-surveyed');
    assert.equal(estimate.measuredRemotely, false);
    assert.equal(estimate.area.facadeNetM2, 156);
    assert.equal(estimate.area.roofNetM2, 87.05);
    assert.equal(estimate.pricing.deposit, 0);
    assert.equal(estimate.pricing.totalPrice,
      estimate.pricing.facadePrice + estimate.pricing.roofPrice,
    );
    assert.equal(
      estimate.pricing.threeInstallmentsIllustration.reduce((sum, amount) => sum + amount, 0),
      estimate.pricing.totalPrice,
    );
  });

  test('rejects empty addresses and validates meteo limits', () => {
    assert.throws(() => calculateEstimate('  '), TypeError);
    assert.equal(validateWeather(30, 5).suitable, true);
    assert.equal(validateWeather(30.1, 5).suitable, false);
    assert.equal(validateWeather(0, 4.9).suitable, false);
  });

  test('creates an estimate and a clearly marked unsigned contract draft', async () => {
    const response = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Ulice <script>alert(1)</script>' }),
    });
    assert.equal(response.status, 200);
    const estimate = await response.json();
    const contractResponse = await fetch(`${baseUrl}/api/generate-contract`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: estimate.estimateId, customerName: '<img src=x>' }),
    });
    const html = await contractResponse.text();
    assert.equal(contractResponse.status, 200);
    assert.ok(html.includes('Nezávazný pracovní návrh'));
    assert.ok(html.includes('&lt;img src=x&gt;'));
    assert.ok(!html.includes('<img src=x>'));
  });

  test('does not create campaign drafts without confirmed work and consent', async () => {
    assert.throws(() => buildCampaignDraft({
      latitude: 50,
      longitude: 14,
      workConfirmed: true,
      consent: false,
    }), /souhlas/);
    const draft = buildCampaignDraft({
      latitude: 50,
      longitude: 14,
      workConfirmed: true,
      consent: true,
    });
    assert.equal(draft.meta.sentToAdPlatforms, false);
    assert.equal(draft.meta.requiresHumanApproval, true);
    assert.equal(draft.googleAds.radiusKm, 5);
  });

  test('exports a printable PDF clearly labeled as an estimate draft', async () => {
    const estimate = calculateEstimate('Praha 1');
    const pdf = await renderEstimatePdf(estimate);
    assert.ok(Buffer.isBuffer(pdf));
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.length > 1000);
  });

  test('serves PDF export and bundled Three.js module from the API', async () => {
    const estimateResponse = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Brno' }),
    });
    const estimate = await estimateResponse.json();
    const pdfResponse = await fetch(`${baseUrl}/api/export-pdf`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: estimate.estimateId }),
    });
    assert.equal(pdfResponse.status, 200);
    assert.match(pdfResponse.headers.get('content-type'), /application\/pdf/);
    assert.equal(Buffer.from(await pdfResponse.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    const threeResponse = await fetch(`${baseUrl}/vendor/three/build/three.module.js`);
    assert.equal(threeResponse.status, 200);
    assert.match(threeResponse.headers.get('content-type'), /javascript/);
    const controlsResponse = await fetch(`${baseUrl}/vendor/three/examples/jsm/controls/OrbitControls.js`);
    assert.equal(controlsResponse.status, 200);
    assert.match(controlsResponse.headers.get('content-type'), /javascript/);
  });

  test('reactivation requires consent and only queues human review after 48 hours', () => {
    const queue = new ReactivationQueue();
    const start = Date.now();
    assert.throws(() => queue.register({
      estimateId: 'estimate-1',
      contact: 'customer@example.cz',
      followUpConsent: false,
    }), /souhlas/);
    const result = queue.register({
      estimateId: 'estimate-1',
      contact: 'customer@example.cz',
      followUpConsent: true,
      now: start,
    });
    assert.equal(result.sendsAutomatically, false);
    assert.equal(queue.getPendingForReview({ now: start + 47 * 60 * 60 * 1000 }).length, 0);
    const pending = queue.getPendingForReview({ now: start + 48 * 60 * 60 * 1000 });
    assert.equal(pending.length, 1);
    assert.equal(pending[0].state, 'awaiting-human-review');
    assert.equal(queue.getPendingForReview({ now: start + 49 * 60 * 60 * 1000 }).length, 0);
    assert.equal(result.id, pending[0].id);
  });

  test('reactivation queue is bounded and expires stored contact details', () => {
    const queue = new ReactivationQueue({ retentionMs: 1000, maxEntries: 1 });
    queue.register({
      estimateId: 'estimate-1',
      contact: 'customer@example.cz',
      followUpConsent: true,
      now: 100,
    });
    assert.throws(() => queue.register({
      estimateId: 'estimate-2',
      contact: 'other@example.cz',
      followUpConsent: true,
      now: 200,
    }), RangeError);
    const next = queue.register({
      estimateId: 'estimate-2',
      contact: 'other@example.cz',
      followUpConsent: true,
      now: 1100,
    });
    assert.ok(next.id);
  });

  test('serves frontend files and accepts consent-gated reactivation only for a known estimate', async () => {
    const homepage = await fetch(baseUrl);
    assert.equal(homepage.status, 200);
    assert.match(homepage.headers.get('content-type'), /text\/html/);
    const estimateResponse = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Kladno' }),
    });
    const estimate = await estimateResponse.json();
    const denied = await fetch(`${baseUrl}/api/reactivation/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: estimate.estimateId, contact: 'a@b.cz', followUpConsent: false }),
    });
    assert.equal(denied.status, 400);
    const accepted = await fetch(`${baseUrl}/api/reactivation/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        estimateId: estimate.estimateId,
        contact: 'customer@example.cz',
        followUpConsent: true,
      }),
    });
    assert.equal(accepted.status, 202);
    assert.equal((await accepted.json()).priceLocked, false);
  });

  test('writes sanitized audit entries and discloses the automated assistant', async () => {
    const response = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Soukromá adresa 123' }),
    });
    assert.equal(response.status, 200);
    const log = await fs.readFile(auditPath, 'utf8');
    assert.ok(log.includes('illustrative-estimate-created'));
    assert.ok(!log.includes('Soukromá adresa'));
    const greetingResponse = await fetch(`${baseUrl}/api/hbot/hello`);
    assert.equal((await greetingResponse.json()).message, assistantGreeting);
  });

  test('deployment check validates directory presence and audit JSONL structure only', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'holub-deploy-check-'));
    const logs = path.join(root, 'server', 'logs');
    await fs.mkdir(logs, { recursive: true, mode: 0o700 });
    assert.equal((await checkDirectory('server/logs', root)).ok, true);
    assert.equal((await checkDirectory('documents', root)).ok, false);
    assert.equal((await checkAuditLog(root)).status, 'missing');

    const auditFile = path.join(logs, 'ai_compliance.log');
    await fs.writeFile(auditFile, `${JSON.stringify({
      timestamp: new Date().toISOString(),
      eventId: 'event-1',
      type: 'test-event',
      amountCzk: 0,
      outcome: 'success',
    })}\n`, { mode: 0o600 });
    const validAudit = await checkAuditLog(root);
    assert.equal(validAudit.ok, true);
    assert.match(validAudit.detail, /kryptografickou nezměnitelnost/);

    await fs.writeFile(auditFile, 'not-json\n', { mode: 0o600 });
    assert.equal((await checkAuditLog(root)).status, 'invalid');
    assert.equal((await checkTransparency(path.resolve(__dirname, '../..'))).ok, true);
    await fs.rm(root, { recursive: true, force: true });
  });

  test('JWT verification enforces signature, role, issuer, audience, and expiry', () => {
    assert.equal(verifyAdminToken(createAdminToken(), ADMIN_SECRET).subject, 'test-admin');
    assert.throws(() => verifyAdminToken(createAdminToken(), `${ADMIN_SECRET}-wrong`), /token/);
    assert.throws(() => verifyAdminToken(createAdminToken({ exp: 1 }), ADMIN_SECRET), /token/);
    assert.throws(() => verifyAdminToken(createAdminToken({ role: 'user' }), ADMIN_SECRET), /token/);
    assert.throws(() => verifyAdminToken(createAdminToken({ aud: 'public-api' }), ADMIN_SECRET), /token/);
    assert.throws(() => verifyAdminToken(createAdminToken(), 'short'), /není nakonfigurováno/);
  });

  test('admin API denies unauthenticated requests and gates contract review', async () => {
    const denied = await fetch(`${baseUrl}/api/admin/overview`);
    assert.equal(denied.status, 401);
    const estimateResponse = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Adresa správní budovy' }),
    });
    const estimate = await estimateResponse.json();
    const headers = {
      authorization: 'Bearer ' + createAdminToken(),
      'content-type': 'application/json',
    };
    const overview = await fetch(`${baseUrl}/api/admin/overview`, { headers });
    assert.equal(overview.status, 200);
    const result = await overview.json();
    assert.equal(result.liveSatelliteTelemetry, false);
    assert.ok(result.requests.some((request) => request.estimateId === estimate.estimateId));

    const premature = await fetch(`${baseUrl}/api/admin/contracts/${estimate.estimateId}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ confirmation: true }),
    });
    assert.equal(premature.status, 409);
    await fetch(`${baseUrl}/api/generate-contract`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: estimate.estimateId, customerName: 'Test objednatel' }),
    });
    const approvalResponse = await fetch(`${baseUrl}/api/admin/contracts/${estimate.estimateId}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ confirmation: true }),
    });
    assert.equal(approvalResponse.status, 200);
    const approval = await approvalResponse.json();
    assert.equal(approval.signed, false);
    assert.equal(approval.sentToProvider, false);
  });

  test('admin campaign action prepares a consent-gated draft only and audit view is authenticated', async () => {
    const headers = {
      authorization: 'Bearer ' + createAdminToken(),
      'content-type': 'application/json',
    };
    const firstEstimateResponse = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Zakázka s odmítnutým potvrzením' }),
    });
    const firstEstimate = await firstEstimateResponse.json();
    const denied = await fetch(`${baseUrl}/api/admin/geo-shield/draft`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        latitude: 50,
        longitude: 14,
        estimateId: firstEstimate.estimateId,
        workConfirmed: false,
        consent: true,
      }),
    });
    assert.equal(denied.status, 400);
    const response = await fetch(`${baseUrl}/api/admin/geo-shield/draft`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        latitude: 50,
        longitude: 14,
        estimateId: firstEstimate.estimateId,
        workConfirmed: true,
        consent: true,
      }),
    });
    assert.equal(response.status, 202);
    const campaign = await response.json();
    assert.equal(campaign.sentToPlatforms, false);
    assert.equal(campaign.campaign.meta.sentToAdPlatforms, false);

    const auditResponse = await fetch(`${baseUrl}/api/admin/audit-log?limit=100`, { headers });
    assert.equal(auditResponse.status, 200);
    const audit = await auditResponse.json();
    assert.ok(audit.records.some((record) => record.type === 'geo-campaign-draft-prepared'));
    assert.equal(audit.tamperProof, false);
  });

  test('admin rate limiter returns 429 after its configured request budget', () => {
    let time = 1000;
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1, now: () => time });
    let nextCount = 0;
    const response = {
      set() { return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    const request = { ip: 'test-client', socket: {} };
    limiter(request, response, () => { nextCount += 1; });
    limiter(request, response, () => { nextCount += 1; });
    assert.equal(nextCount, 1);
    assert.equal(response.statusCode, 429);
    time += 1001;
    limiter(request, response, () => { nextCount += 1; });
    assert.equal(nextCount, 2);
  });
});
