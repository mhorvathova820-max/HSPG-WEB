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
