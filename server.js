'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const compression = require('compression');
const { calculateEstimate, validateWeather } = require('./server/services/estimate');
const { createAuditLogger } = require('./server/services/auditLogger');
const { buildContractHtml } = require('./server/services/contractHtml');
const { buildCampaignDraft } = require('./server/services/campaignDraft');
const { renderEstimatePdf } = require('./server/services/pdfExportEngine');
const { ReactivationQueue } = require('./server/services/reactivationQueue');
const { createRateLimiter, verifyAdminToken } = require('./server/services/adminAuth');
const { createAgentService } = require('./server/services/agents');

const assistantGreeting = 'Dobrý den, jsem automatizovaný asistent HOLUB Core. Mohu vám pomoci s orientačními informacemi.';
const publicDirectory = path.join(__dirname, 'public');
const threeDirectory = path.join(__dirname, 'node_modules', 'three');
const auditLogPath = path.join(__dirname, 'server', 'logs', 'ai_compliance.log');

function loadLocalEnvironment() {
  try {
    process.loadEnvFile(path.join(__dirname, '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function createApp({
  auditLogger = createAuditLogger(auditLogPath),
  auditReaderPath = auditLogPath,
  adminJwtSecret = process.env.ADMIN_JWT_SECRET,
  agentService = createAgentService(),
} = {}) {
  const app = express();
  const estimates = new Map();
  const estimateMetadata = new Map();
  const contractDrafts = new Set();
  const reviewedContracts = new Map();
  const reactivationQueue = new ReactivationQueue();
  let activePdfExports = 0;

  app.disable('x-powered-by');
  const trustedProxyIps = (process.env.TRUSTED_PROXY_IPS || '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  app.set('trust proxy', trustedProxyIps);
  app.use(express.json({ limit: '16kb', type: 'application/json' }));
  app.use((req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    next();
  });
  app.use(compression({ threshold: 1024, level: 6 }));
  app.use((req, res, next) => {
    if (req.path === '/admin-cockpit.html') {
      res.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      );
    }
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
      estimateMetadata.set(estimateId, {
        createdAt: new Date().toISOString(),
        contractStatus: 'not-generated',
      });
      if (estimates.size > 1000) {
        const oldestEstimateId = estimates.keys().next().value;
        estimates.delete(oldestEstimateId);
        estimateMetadata.delete(oldestEstimateId);
        contractDrafts.delete(oldestEstimateId);
        reviewedContracts.delete(oldestEstimateId);
      }
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
      contractDrafts.add(estimateId);
      estimateMetadata.get(estimateId).contractStatus = 'awaiting-manual-review';
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
    if (activePdfExports >= 2) {
      return res.status(503).json({ error: 'Kapacita exportu je dočasně vytížena; zkuste to později.' });
    }
    activePdfExports += 1;
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
    } finally {
      activePdfExports -= 1;
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

  const adminLimiter = createRateLimiter();
  app.use('/api/admin', adminLimiter, (req, res, next) => {
    const remoteAddress = req.socket.remoteAddress || '';
    const isLoopback = remoteAddress === '127.0.0.1' ||
      remoteAddress === '::1' ||
      remoteAddress === '::ffff:127.0.0.1';
    if (!req.secure && !isLoopback) {
      return res.status(426).json({ error: 'Administrátorské rozhraní vyžaduje HTTPS.' });
    }
    const authorization = req.get('authorization') || '';
    const match = /^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(authorization);
    if (!match) return res.status(401).json({ error: 'Je vyžadováno platné administrátorské přihlášení.' });
    try {
      req.admin = verifyAdminToken(match[1], adminJwtSecret);
      return next();
    } catch (error) {
      const status = error.statusCode || 401;
      return res.status(status).json({
        error: status === 503
          ? 'Administrátorské ověření není nakonfigurováno.'
          : 'Je vyžadováno platné administrátorské přihlášení.',
      });
    }
  });

  app.get('/api/admin/overview', (req, res) => {
    const requests = [...estimateMetadata.entries()]
      .map(([estimateId, metadata]) => ({
        estimateId,
        createdAt: metadata.createdAt,
        address: estimates.get(estimateId).address,
        estimatedPriceCzk: estimates.get(estimateId).pricing.totalPrice,
        estimateType: estimates.get(estimateId).estimateType,
        contractStatus: reviewedContracts.get(estimateId)?.status || metadata.contractStatus,
      }))
      .reverse()
      .slice(0, 100);
    res.json({
      refreshedAt: new Date().toISOString(),
      refreshIntervalSeconds: 15,
      liveSatelliteTelemetry: false,
      note: 'Seznam obsahuje pouze lokální modelové kalkulace; nejde o satelitní telemetrii.',
      requests,
    });
  });

  app.get('/api/admin/audit-log', async (req, res, next) => {
    try {
      const requestedLimit = Number(req.query.limit);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
      const details = await fs.lstat(auditReaderPath);
      if (!details.isFile() || details.isSymbolicLink() || details.size > 2 * 1024 * 1024) {
        return res.status(503).json({ error: 'Auditní soubor není dostupný pro bezpečné zobrazení.' });
      }
      const content = await fs.readFile(auditReaderPath, 'utf8');
      const records = content.split('\n').filter(Boolean).slice(-limit).flatMap((line) => {
        try {
          const record = JSON.parse(line);
          return [{
            timestamp: record.timestamp,
            eventId: record.eventId,
            type: record.type,
            amountCzk: Number.isFinite(record.amountCzk) ? record.amountCzk : null,
            outcome: record.outcome,
            agentId: typeof record.agentId === 'string' ? record.agentId : null,
            promptSha256: typeof record.promptSha256 === 'string' ? record.promptSha256 : null,
            outputSha256: typeof record.outputSha256 === 'string' ? record.outputSha256 : null,
          }];
        } catch {
          return [];
        }
      });
      res.json({
        records,
        tamperProof: false,
        legalComplianceCertified: false,
        viewedBy: req.admin.subject,
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Auditní log zatím neobsahuje žádný soubor.' });
      }
      next(error);
    }
  });

  app.get('/api/admin/agents', (_req, res) => {
    res.json({
      agents: agentService.list(),
      notice: 'Agenti reagují pouze na výslovný požadavek správce, po souhlasu s předáním textu Anthropic; výstupy vyžadují lidskou kontrolu.',
    });
  });

  app.post('/api/admin/agents/:agentId/run', async (req, res, next) => {
    try {
      const result = await agentService.run(req.params.agentId, {
        input: req.body?.input,
        externalProcessingConsent: req.body?.externalProcessingConsent,
      });
      await auditLogger({
        eventId: crypto.randomUUID(),
        type: 'admin-agent-draft-generated',
        outcome: 'human-review-required-not-published',
        agentId: result.agentId,
        provider: result.provider,
        model: result.model,
        promptSha256: result.promptSha256,
        outputSha256: result.outputSha256,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/contracts/:estimateId/approve', async (req, res, next) => {
    try {
      const { estimateId } = req.params;
      if (!estimates.has(estimateId)) return res.status(404).json({ error: 'Kalkulace nebyla nalezena.' });
      if (!contractDrafts.has(estimateId)) {
        return res.status(409).json({ error: 'Nejprve musí vzniknout návrh smlouvy k ruční kontrole.' });
      }
      if (req.body?.confirmation !== true) {
        return res.status(400).json({ error: 'Pro schválení je nutné potvrdit ruční kontrolu návrhu.' });
      }
      const approval = {
        status: 'approved-for-signature-provider-review',
        approvedAt: new Date().toISOString(),
        approvedBy: req.admin.subject,
        signed: false,
        sentToProvider: false,
      };
      reviewedContracts.set(estimateId, approval);
      estimateMetadata.get(estimateId).contractStatus = approval.status;
      await auditLogger({
        eventId: crypto.randomUUID(),
        type: 'contract-draft-manually-reviewed',
        amountCzk: estimates.get(estimateId).pricing.totalPrice,
        outcome: 'approved-for-provider-review-not-signed',
      });
      res.json({
        estimateId,
        ...approval,
        message: 'Ruční kontrola zaznamenána. Dokument není podepsán ani odeslán do DigiSign/BankID.',
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/geo-shield/draft', async (req, res, next) => {
    try {
      if (!estimates.has(req.body?.estimateId)) {
        return res.status(404).json({ error: 'Kalkulace pro návrh kampaně nebyla nalezena.' });
      }
      const campaign = buildCampaignDraft(req.body || {});
      await auditLogger({
        eventId: crypto.randomUUID(),
        type: 'geo-campaign-draft-prepared',
        amountCzk: estimates.get(req.body.estimateId).pricing.totalPrice,
        outcome: 'not-sent-awaiting-provider-and-human-review',
      });
      res.status(202).json({
        campaign,
        estimateId: req.body.estimateId,
        status: 'draft-only',
        sentToPlatforms: false,
        providerIntegrationConfigured: false,
        preparedBy: req.admin.subject,
      });
    } catch (error) {
      next(error);
    }
  });

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
    if (error?.statusCode === 503) return res.status(503).json({ error: error.message });
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
