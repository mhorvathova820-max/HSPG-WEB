'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { after, before, describe, test } = require('node:test');
const { rateLimit } = require('express-rate-limit');
const { createApp, assistantGreeting } = require('../../server');
const { calculateEstimate, validateWeather } = require('../services/estimate');
const { createAuditLogger } = require('../services/auditLogger');
const { buildCampaignDraft } = require('../services/campaignDraft');
const { renderEstimatePdf } = require('../services/pdfExportEngine');
const { ReactivationQueue } = require('../services/reactivationQueue');
const { checkAuditLog, checkDirectory, checkTransparency } = require('../../deploy-orchestrator');
const { verifyAdminToken } = require('../services/adminAuth');
const { createAgentService } = require('../services/agents');

const ADMIN_SECRET = 'a-test-only-secret-that-is-long-enough-for-hmac';
const agentService = createAgentService({
  model: 'test-model',
  client: {
    messages: {
      async create(request) {
        return {
          content: [{ type: 'text', text: `Návrh pro správce podle role: ${request.system.slice(0, 50)}` }],
        };
      },
    },
  },
});

function createAdminToken(claimOverrides = {}, secret = ADMIN_SECRET) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const claims = encode({
    iss: 'holub360',
    aud: 'holub360-admin',
    role: 'admin',
    sub: 'test-admin',
    iat: now,
    exp: now + 300,
    ...claimOverrides,
  });
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest('base64url');
  return `${header}.${claims}.${signature}`;
}

describe('HOLUB 360 API foundation', () => {
  let directory;
  let app;
  let server;
  let baseUrl;
  let auditPath;

  before(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'holub360-test-'));
    auditPath = path.join(directory, 'audit.log');
    app = createApp({
      auditLogger: createAuditLogger(auditPath),
      auditReaderPath: auditPath,
      adminJwtSecret: ADMIN_SECRET,
      agentService,
    });
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    app.locals.close();
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

  test('serves PDF export and optimized frontend bundles without exposing raw vendor modules', async () => {
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
    const visualizer = await fetch(`${baseUrl}/dist/holub30-visualizer.bundle.js`);
    assert.equal(visualizer.status, 200);
    assert.match(visualizer.headers.get('content-type'), /javascript/);
    assert.match(visualizer.headers.get('cache-control'), /max-age=3600/);
    const style = await fetch(`${baseUrl}/dist/holub30-style.css`);
    assert.equal(style.status, 200);
    assert.match(style.headers.get('content-type'), /text\/css/);
    const distPath = path.resolve(__dirname, '../../public/dist');
    const chunkFiles = await fs.readdir(distPath);
    let chunk;
    for (const name of chunkFiles.filter((file) => file.endsWith('.js'))) {
      const details = await fs.stat(path.join(distPath, name));
      if (details.size > 300 * 1024) {
        chunk = name;
        break;
      }
    }
    assert.ok(chunk, 'expected the deferred Three.js vendor chunk');
    const compressed = await fetch(`${baseUrl}/dist/${chunk}`, {
      headers: { 'accept-encoding': 'gzip' },
    });
    assert.equal(compressed.headers.get('content-encoding'), 'gzip');
    const unbundledVendor = await fetch(`${baseUrl}/vendor/three/build/three.module.js`);
    assert.equal(unbundledVendor.status, 404);
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

  test('admin rate limiter enforces the request budget at the route', async () => {
    const limitedApp = createApp({
      auditLogger: async () => {},
      auditReaderPath: auditPath,
      adminJwtSecret: ADMIN_SECRET,
      agentService,
      adminRateLimiter: rateLimit({
        windowMs: 60_000,
        limit: 1,
        standardHeaders: false,
        legacyHeaders: false,
      }),
    });
    const limitedServer = limitedApp.listen(0);
    await new Promise((resolve) => limitedServer.once('listening', resolve));
    const url = `http://127.0.0.1:${limitedServer.address().port}/api/admin/agents`;
    const headers = { authorization: 'Bearer ' + createAdminToken() };
    try {
      assert.equal((await fetch(url, { headers })).status, 200);
      assert.equal((await fetch(url, { headers })).status, 429);
    } finally {
      await new Promise((resolve, reject) => limitedServer.close((error) => error ? reject(error) : resolve()));
      limitedApp.locals.close();
    }
  });

  test('Claude agents require administrator, explicit consent, anonymized text, and retain only fingerprints', async () => {
    const headers = {
      authorization: 'Bearer ' + createAdminToken(),
      'content-type': 'application/json',
    };
    const listing = await fetch(`${baseUrl}/api/admin/agents`, { headers });
    assert.equal(listing.status, 200);
    const agents = await listing.json();
    assert.equal(agents.agents.length, 4);
    assert.ok(agents.agents.every((agent) => agent.humanReviewRequired && !agent.externalActionsEnabled));

    const noConsent = await fetch(`${baseUrl}/api/admin/agents/web-dominance/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input: 'Obecný obsah pro návrh.', externalProcessingConsent: false }),
    });
    assert.equal(noConsent.status, 400);
    const piiInput = await fetch(`${baseUrl}/api/admin/agents/web-dominance/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: 'Kontaktujte pana na adrese owner@example.cz.',
        externalProcessingConsent: true,
      }),
    });
    assert.equal(piiInput.status, 400);

    const generated = await fetch(`${baseUrl}/api/admin/agents/competitor-review/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: 'Porovnej pouze tento anonymizovaný technický popis produktu.',
        externalProcessingConsent: true,
      }),
    });
    assert.equal(generated.status, 200);
    const result = await generated.json();
    assert.equal(result.approved, false);
    assert.equal(result.dispatched, false);
    assert.match(result.promptSha256, /^[a-f0-9]{64}$/);
    const auditResponse = await fetch(`${baseUrl}/api/admin/audit-log?limit=100`, { headers });
    const audit = await auditResponse.json();
    assert.ok(audit.records.some((record) =>
      record.type === 'admin-agent-draft-generated' &&
      record.agentId === 'competitor-review' &&
      /^[a-f0-9]{64}$/.test(record.outputSha256),
    ));
    const logContent = await fs.readFile(auditPath, 'utf8');
    assert.ok(!logContent.includes('Porovnej pouze tento anonymizovaný technický popis produktu.'));
    assert.match(logContent, /promptSha256/);
  });

  test('Claude agent service remains disabled without explicit provider configuration', async () => {
    const disabledAgentService = createAgentService({ apiKey: '', model: '' });
    assert.ok(disabledAgentService.list().every((agent) => !agent.providerConfigured));
    await assert.rejects(
      disabledAgentService.run('web-dominance', {
        input: 'Anonymizovaný text.',
        externalProcessingConsent: true,
      }),
      (error) => error.statusCode === 503,
    );
  });

  test('admin cockpit is online-only, serves manifest, and discloses AI assistance', async () => {
    const page = await fetch(`${baseUrl}/admin-cockpit.html`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
    const html = await page.text();
    assert.match(html, /Dobrý den, jsem automatizovaný asistent HOLUB Core/);
    const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
    assert.equal(manifest.status, 200);
    const worker = await fetch(`${baseUrl}/service-worker.js`);
    const workerSource = await worker.text();
    assert.match(workerSource, /admin-cockpit\.html/);
    assert.match(workerSource, /caches\.match/);
  });
});
