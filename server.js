'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { calculateEstimate, validateWeather } = require('./server/services/estimate');
const { createAuditLogger } = require('./server/services/auditLogger');
const { buildContractHtml } = require('./server/services/contractHtml');
const { buildCampaignDraft } = require('./server/services/campaignDraft');
const { renderEstimatePdf } = require('./server/services/pdfExportEngine');
const { ReactivationQueue } = require('./server/services/reactivationQueue');

const assistantGreeting = 'Dobrý den, jsem automatizovaný asistent HOLUB Core. Mohu vám pomoci s orientačními informacemi.';
const publicDirectory = path.join(__dirname, 'public');
const threeDirectory = path.join(__dirname, 'node_modules', 'three');

function loadLocalEnvironment() {
  try {
    process.loadEnvFile(path.join(__dirname, '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function createApp({ auditLogger = createAuditLogger() } = {}) {
  const app = express();
  const estimates = new Map();
  const reactivationQueue = new ReactivationQueue();

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
  const staticVendorOptions = {
    fallthrough: false,
    immutable: true,
    maxAge: '1d',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.js')) res.type('text/javascript');
    },
  };
  app.use('/vendor/three/build', express.static(path.join(threeDirectory, 'build'), staticVendorOptions));
  app.use('/vendor/three/examples', express.static(path.join(threeDirectory, 'examples'), staticVendorOptions));
  app.use(express.static(publicDirectory, { index: 'index.html', fallthrough: true }));

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

  app.post('/api/export-pdf', async (req, res, next) => {
    try {
      const estimate = estimates.get(req.body?.estimateId);
      if (!estimate) return res.status(404).json({ error: 'Kalkulace nebyla nalezena nebo již není dostupná.' });
      const pdf = await renderEstimatePdf(estimate);
      await auditLogger({
        eventId: crypto.randomUUID(),
        type: 'illustrative-pdf-created',
        amountCzk: estimate.pricing.totalPrice,
        outcome: 'draft-not-contract',
      });
      res.type('application/pdf')
        .set('Content-Disposition', 'attachment; filename="holub360-orientacni-nabidka.pdf"')
        .send(pdf);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/reactivation/register', (req, res, next) => {
    try {
      const estimateId = req.body?.estimateId;
      if (!estimates.has(estimateId)) {
        return res.status(404).json({ error: 'Kalkulace nebyla nalezena nebo již není dostupná.' });
      }
      const result = reactivationQueue.register({
        estimateId,
        contact: req.body?.contact,
        followUpConsent: req.body?.followUpConsent,
      });
      res.status(202).json({
        ...result,
        messageStatus: 'not-sent-awaiting-48-hour-review',
        priceLocked: false,
        paymentApproval: false,
      });
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

  app.locals.reactivationQueue = reactivationQueue;
  const reviewTimer = setInterval(() => {
    reactivationQueue.getPendingForReview();
  }, 60 * 1000);
  reviewTimer.unref();
  app.locals.close = () => clearInterval(reviewTimer);

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'Neplatný JSON požadavek.' });
    }
    if (error instanceof RangeError) return res.status(503).json({ error: error.message });
    if (error instanceof TypeError) return res.status(400).json({ error: error.message });
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Požadavek je příliš velký.' });
    console.error('Chyba požadavku:', error);
    return res.status(500).json({ error: 'Požadavek se nepodařilo zpracovat.' });
  });

  return app;
}

if (require.main === module) {
  loadLocalEnvironment();
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    console.log(`HOLUB 360 API naslouchá na portu ${port}.`);
  });
}

module.exports = { createApp, assistantGreeting, loadLocalEnvironment };
