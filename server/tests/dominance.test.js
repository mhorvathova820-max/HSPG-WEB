'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { after, before, describe, test } = require('node:test');
const { createApp, assistantGreeting } = require('../../server');
const { calculateEstimate, validateWeather } = require('../services/estimate');
const { createAuditLogger } = require('../services/auditLogger');
const { buildCampaignDraft } = require('../services/campaignDraft');
const { renderEstimatePdf } = require('../services/pdfExportEngine');
const { ReactivationQueue } = require('../services/reactivationQueue');

describe('HOLUB 360 API foundation', () => {
  let directory;
  let server;
  let baseUrl;
  let auditPath;

  before(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'holub360-test-'));
    auditPath = path.join(directory, 'audit.log');
    const app = createApp({ auditLogger: createAuditLogger(auditPath) });
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
    const threeResponse = await fetch(`${baseUrl}/vendor/three.module.js`);
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
});
