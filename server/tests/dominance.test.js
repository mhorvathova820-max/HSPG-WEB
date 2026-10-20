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
const {
  applyContentPriceMatrix,
  calculateCopperGuard,
} = require('../services/contentPriceMatrix');
const { findNearestVerifiedReference } = require('../services/referenceMatrix');

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
      addressValidator: async (address) => ({ valid: address !== 'Neexistující 1' }),
      propertyProfiler: async (address) => address === 'Testovaný bytový dům'
        ? {
          verified: true,
          buildingType: 'apartment-building',
          roofRidgeLengthM: 7.2,
          coordinates: { latitude: 50, longitude: 14 },
          svjSavingsScenario: {
            verified: true,
            sourceName: 'Testovací doložený srovnávací podklad',
            evidenceUrl: 'https://example.com/test-svj-study',
            hspgAnnualCostsCzk: [10000, 10000, 4000],
            delayAnnualCostsCzk: [40000, 30000, 30000],
          },
        }
        : null,
      verifiedReferences: [
        {
          id: 'test-reference-near',
          title: 'Testovací ověřená realizace',
          locality: 'Testov',
          coordinates: { latitude: 50.01, longitude: 14.01 },
          verified: true,
        },
        {
          id: 'test-reference-far',
          title: 'Vzdálená testovací realizace',
          coordinates: { latitude: 51, longitude: 15 },
          verified: true,
        },
      ],
      svjGuildDiscountPercent: 10,
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

  test('applies copper price tiers only to a verified ridge length', () => {
    assert.deepEqual(calculateCopperGuard(null), {
      available: false,
      verifiedRidgeLengthM: null,
      priceCzk: null,
      status: 'ridge-length-not-verified',
    });
    assert.equal(calculateCopperGuard(4).priceCzk, 1490);
    assert.equal(calculateCopperGuard(4.01).priceCzk, 1780);
    assert.equal(calculateCopperGuard(8).priceCzk, 2650);
    assert.equal(calculateCopperGuard(1001).available, false);
  });

  test('applies the SVJ window-covering supplement and only a configured guild discount', () => {
    const estimate = calculateEstimate('Testovací objekt');
    const regular = applyContentPriceMatrix(estimate);
    assert.equal(regular.housingCooperative.eligible, false);
    assert.equal(regular.copperGuard.available, false);

    const svj = applyContentPriceMatrix(estimate, {
      buildingProfile: { verified: true, buildingType: 'apartment-building', roofRidgeLengthM: 5 },
      svjGuildDiscountPercent: 10,
    });
    assert.equal(svj.housingCooperative.eligible, true);
    assert.equal(svj.pricing.windowCoverPrice, 780);
    assert.equal(svj.pricing.svjGuildDiscount, Math.round((estimate.pricing.totalPrice + 780) * 0.1));
    assert.equal(svj.copperGuard.priceCzk, 1780);
    assert.equal(svj.pricing.totalPrice,
      estimate.pricing.totalPrice + 780 - svj.pricing.svjGuildDiscount);

    const noDiscount = applyContentPriceMatrix(estimate, {
      buildingProfile: { verified: true, buildingType: 'apartment-building' },
    });
    assert.equal(noDiscount.housingCooperative.guildDiscountConfigured, false);
    assert.equal(noDiscount.pricing.svjGuildDiscount, 0);
    assert.throws(() => applyContentPriceMatrix(estimate, { svjGuildDiscountPercent: 101 }), TypeError);
    assert.equal(applyContentPriceMatrix(estimate, {
      buildingProfile: {
        verified: true,
        buildingType: 'apartment-building',
        svjSavingsScenario: {
          verified: true,
          sourceName: 'Neplatný zdroj',
          evidenceUrl: 'https://',
          hspgAnnualCostsCzk: [1, 1],
          delayAnnualCostsCzk: [10, 10],
        },
      },
    }).housingCooperative.savingsScenario, null);
  });

  test('selects only verified nearest references from validated coordinates', () => {
    const location = { latitude: 50, longitude: 14 };
    const references = [
      {
        id: 'near',
        title: 'Blízká reference',
        evidenceUrl: 'javascript:alert(1)',
        coordinates: { latitude: 50.01, longitude: 14.01 },
        verified: true,
      },
      {
        id: 'unverified',
        title: 'Neověřená reference',
        coordinates: { latitude: 50.001, longitude: 14.001 },
        verified: false,
      },
    ];
    assert.equal(findNearestVerifiedReference(location, references).id, 'near');
    assert.equal(findNearestVerifiedReference(location, references).evidenceUrl, null);
    assert.equal(findNearestVerifiedReference(location, []), null);
    assert.equal(findNearestVerifiedReference({ latitude: 100, longitude: 14 }, references), null);
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

  test('routes unverified addresses to a priority manual queue without inventing geolocation', async () => {
    const response = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Neexistující 1' }),
    });
    assert.equal(response.status, 202);
    const fallback = await response.json();
    assert.equal(fallback.status, 'awaiting-manual-address-review');
    assert.equal(fallback.addressStatus, 'not-verified');
    assert.equal(fallback.adminNotification.priority, 'critical');
    assert.equal(
      fallback.adminNotification.message,
      'CRITICAL: Ruční satelitní revize nutná pro zakázku',
    );
    assert.equal('latitude' in fallback, false);
    assert.match(fallback.message, /nevytváříme nepřesné měření ani polohu/);
    const queueResponse = await fetch(`${baseUrl}/api/admin/address-reviews`, {
      headers: { authorization: 'Bearer ' + createAdminToken() },
    });
    assert.equal(queueResponse.status, 200);
    const queue = await queueResponse.json();
    assert.ok(queue.reviews.some((review) => review.requestId === fallback.requestId));
  });

  test('accepts competitor documents only for consented human review and verifies file signatures', async () => {
    const invalid = new FormData();
    invalid.append('processingConsent', 'true');
    invalid.append('document', new Blob(['not a PDF'], { type: 'application/pdf' }), 'offer.pdf');
    const invalidResponse = await fetch(`${baseUrl}/api/competitor-review`, {
      method: 'POST',
      headers: { 'x-processing-consent': 'true' },
      body: invalid,
    });
    assert.equal(invalidResponse.status, 400);

    const noConsent = new FormData();
    noConsent.append('document', new Blob(['%PDF-1.4\n'], { type: 'application/pdf' }), 'offer.pdf');
    const noConsentResponse = await fetch(`${baseUrl}/api/competitor-review`, {
      method: 'POST',
      body: noConsent,
    });
    assert.equal(noConsentResponse.status, 400);

    const valid = new FormData();
    valid.append('processingConsent', 'true');
    valid.append('document', new Blob(['%PDF-1.4\n'], { type: 'application/pdf' }), 'offer.pdf');
    const response = await fetch(`${baseUrl}/api/competitor-review`, {
      method: 'POST',
      headers: { 'x-processing-consent': 'true' },
      body: valid,
    });
    assert.equal(response.status, 202);
    const review = await response.json();
    assert.equal(review.ocrPerformed, false);
    assert.deepEqual(review.automatedFindings, []);
    assert.equal(review.status, 'awaiting-human-review-ocr-unavailable');
    assert.match(review.sha256, /^[a-f0-9]{64}$/);
  });

  test('integrates a verified apartment profile, nearest reference, and printable SVJ resolution', async () => {
    const estimateResponse = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Testovaný bytový dům' }),
    });
    assert.equal(estimateResponse.status, 200);
    const estimate = await estimateResponse.json();
    assert.equal(estimate.housingCooperative.eligible, true);
    assert.equal(estimate.pricing.windowCoverPrice, 780);
    assert.equal(estimate.copperGuard.verifiedRidgeLengthM, 7.2);
    assert.equal(estimate.copperGuard.priceCzk, 2650);
    assert.equal(estimate.socialProof.reference.id, 'test-reference-near');
    assert.equal(estimate.housingCooperative.savingsScenario.savingsPercent, 76);

    const offerPdfResponse = await fetch(`${baseUrl}/api/export-pdf`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: estimate.estimateId }),
    });
    assert.equal(offerPdfResponse.status, 200);
    assert.match(offerPdfResponse.headers.get('content-type'), /application\/pdf/);

    const pdfResponse = await fetch(`${baseUrl}/api/export-svj-resolution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: estimate.estimateId }),
    });
    assert.equal(pdfResponse.status, 200);
    const pdf = Buffer.from(await pdfResponse.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.length > 1000);

    const regularEstimateResponse = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Praha' }),
    });
    const regularEstimate = await regularEstimateResponse.json();
    const deniedPdf = await fetch(`${baseUrl}/api/export-svj-resolution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: regularEstimate.estimateId }),
    });
    assert.equal(deniedPdf.status, 409);
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
    const svjPage = await fetch(`${baseUrl}/kalkulacka-svj`);
    assert.equal(svjPage.status, 200);
    assert.match(await svjPage.text(), /svj-savings-chart/);
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
    const photoBlocked = await fetch(`${baseUrl}/api/admin/contracts/${estimate.estimateId}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ confirmation: true }),
    });
    assert.equal(photoBlocked.status, 409);
    const photoBlock = await photoBlocked.json();
    assert.equal(photoBlock.remainingPhotoCount, 3);
    assert.equal(photoBlock.signatureRequestSent, false);

    const photoForm = new FormData();
    for (let i = 0; i < 3; i += 1) {
      const jpeg = new Blob([Buffer.from([0xff, 0xd8, 0xff, i + 1])], { type: 'image/jpeg' });
      photoForm.append('photos', jpeg, `completion-${i}.jpg`);
    }
    const invalidPhotoForm = new FormData();
    invalidPhotoForm.append('photos', new Blob(['not an image'], { type: 'image/jpeg' }), 'bad.jpg');
    const invalidPhotoResponse = await fetch(
      `${baseUrl}/api/admin/estimates/${estimate.estimateId}/completion-photos`,
      {
        method: 'POST',
        headers: { authorization: headers.authorization },
        body: invalidPhotoForm,
      },
    );
    assert.equal(invalidPhotoResponse.status, 400);
    const photoResponse = await fetch(
      `${baseUrl}/api/admin/estimates/${estimate.estimateId}/completion-photos`,
      {
        method: 'POST',
        headers: { authorization: headers.authorization },
        body: photoForm,
      },
    );
    assert.equal(photoResponse.status, 201);
    const photoResult = await photoResponse.json();
    assert.equal(photoResult.photoCount, 3);
    assert.equal(photoResult.eligibleForFinalSignatureReview, true);
    assert.equal(photoResult.imageBytesPersisted, false);

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
