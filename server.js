'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { calculateEstimate, validateWeather } = require('./server/services/estimate');
const { createAuditLogger } = require('./server/services/auditLogger');
const { buildContractHtml } = require('./server/services/contractHtml');
const { buildCampaignDraft } = require('./server/services/campaignDraft');

const assistantGreeting = 'Dobrý den, jsem automatizovaný asistent HOLUB Core. Mohu vám pomoci s orientačními informacemi.';

function createApp({ auditLogger = createAuditLogger() } = {}) {
  const app = express();
  const estimates = new Map();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb', type: 'application/json' }));
  app.use((req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    next();
  });

  app.post('/api/satellite-scan', async (req, res, next) => {
    try {
      const estimate = calculateEstimate(req.body?.address);
      const estimateId = crypto.randomUUID();
      estimates.set(estimateId, estimate);
      if (estimates.size > 1000) estimates.delete(estimates.keys().next().value);
      await auditLogger({
        eventId: estimateId,
        type: 'illustrative-estimate-created',
        amountCzk: estimate.pricing.totalPrice,
        outcome: 'success',
      });
      res.status(200).json({ estimateId, ...estimate });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/meteo-validation', (req, res, next) => {
    try {
      res.json(validateWeather(req.body?.rainProbability, req.body?.temperatureC));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/generate-contract', async (req, res, next) => {
    try {
      const { estimateId, customerName } = req.body || {};
      const estimate = estimates.get(estimateId);
      if (!estimate) return res.status(404).json({ error: 'Kalkulace nebyla nalezena nebo již není dostupná.' });
      if (typeof customerName !== 'string' || !customerName.trim() || customerName.trim().length > 200) {
        return res.status(400).json({ error: 'Zadejte platné jméno objednatele.' });
      }
      const contractId = crypto.randomUUID();
      await auditLogger({
        eventId: contractId,
        type: 'contract-draft-created',
        amountCzk: estimate.pricing.totalPrice,
        outcome: 'draft-not-signed',
      });
      res.type('html').send(buildContractHtml({ estimate, customerName: customerName.trim() }));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/trigger-geo-shield', (req, res, next) => {
    try {
      res.json(buildCampaignDraft(req.body || {}));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/hbot/hello', (_req, res) => res.json({ message: assistantGreeting }));

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'Neplatný JSON požadavek.' });
    }
    if (error instanceof TypeError) return res.status(400).json({ error: error.message });
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Požadavek je příliš velký.' });
    console.error('Chyba požadavku:', error);
    return res.status(500).json({ error: 'Požadavek se nepodařilo zpracovat.' });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    console.log(`HOLUB 360 API naslouchá na portu ${port}.`);
  });
}

module.exports = { createApp, assistantGreeting };
