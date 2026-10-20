'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp, assistantGreeting } = require('../../server');
const { calculateEstimate, validateWeather } = require('../services/estimate');
const { createAuditLogger } = require('../services/auditLogger');
const { buildCampaignDraft } = require('../services/campaignDraft');

describe('HOLUB 360 API foundation', () => {
  let directory;
  let server;
  let baseUrl;
  let auditPath;

  beforeAll(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'holub360-test-'));
    auditPath = path.join(directory, 'audit.log');
    const app = createApp({ auditLogger: createAuditLogger(auditPath) });
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(directory, { recursive: true, force: true });
  });

  test('calculates model areas and prices transparently', () => {
    const estimate = calculateEstimate('Stavební 1066');
    expect(estimate.estimateType).toBe('illustrative-model-not-surveyed');
    expect(estimate.measuredRemotely).toBe(false);
    expect(estimate.area.facadeNetM2).toBe(156);
    expect(estimate.area.roofNetM2).toBe(87.05);
    expect(estimate.pricing.deposit).toBe(0);
    expect(estimate.pricing.totalPrice).toBe(
      estimate.pricing.facadePrice + estimate.pricing.roofPrice,
    );
    expect(estimate.pricing.threeInstallmentsIllustration.reduce((sum, amount) => sum + amount, 0))
      .toBe(estimate.pricing.totalPrice);
  });

  test('rejects empty addresses and validates meteo limits', () => {
    expect(() => calculateEstimate('  ')).toThrow(TypeError);
    expect(validateWeather(30, 5).suitable).toBe(true);
    expect(validateWeather(30.1, 5).suitable).toBe(false);
    expect(validateWeather(0, 4.9).suitable).toBe(false);
  });

  test('creates an estimate and a clearly marked unsigned contract draft', async () => {
    const response = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Ulice <script>alert(1)</script>' }),
    });
    expect(response.status).toBe(200);
    const estimate = await response.json();
    const contractResponse = await fetch(`${baseUrl}/api/generate-contract`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: estimate.estimateId, customerName: '<img src=x>' }),
    });
    const html = await contractResponse.text();
    expect(contractResponse.status).toBe(200);
    expect(html).toContain('Nezávazný pracovní návrh');
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).not.toContain('<img src=x>');
  });

  test('does not create campaign drafts without confirmed work and consent', async () => {
    expect(() => buildCampaignDraft({
      latitude: 50,
      longitude: 14,
      workConfirmed: true,
      consent: false,
    })).toThrow(/souhlas/);
    const draft = buildCampaignDraft({
      latitude: 50,
      longitude: 14,
      workConfirmed: true,
      consent: true,
    });
    expect(draft.meta.sentToAdPlatforms).toBe(false);
    expect(draft.meta.requiresHumanApproval).toBe(true);
    expect(draft.googleAds.radiusKm).toBe(5);
  });

  test('writes sanitized audit entries and discloses the automated assistant', async () => {
    const response = await fetch(`${baseUrl}/api/satellite-scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Soukromá adresa 123' }),
    });
    expect(response.status).toBe(200);
    const log = await fs.readFile(auditPath, 'utf8');
    expect(log).toContain('illustrative-estimate-created');
    expect(log).not.toContain('Soukromá adresa');
    const greetingResponse = await fetch(`${baseUrl}/api/hbot/hello`);
    expect((await greetingResponse.json()).message).toBe(assistantGreeting);
  });
});
