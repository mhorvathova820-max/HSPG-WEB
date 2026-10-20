'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function createAuditLogger(filePath = path.join(__dirname, '..', 'logs', 'ai_compliance.log')) {
  return async function writeAuditEvent(event) {
    const safeRecord = {
      timestamp: new Date().toISOString(),
      eventId: event.eventId,
      type: event.type,
      amountCzk: Number.isFinite(event.amountCzk) ? event.amountCzk : null,
      outcome: event.outcome,
      agentId: typeof event.agentId === 'string' ? event.agentId.slice(0, 80) : undefined,
      provider: typeof event.provider === 'string' ? event.provider.slice(0, 40) : undefined,
      model: typeof event.model === 'string' ? event.model.slice(0, 100) : undefined,
      promptSha256: /^[a-f0-9]{64}$/.test(event.promptSha256 || '') ? event.promptSha256 : undefined,
      outputSha256: /^[a-f0-9]{64}$/.test(event.outputSha256 || '') ? event.outputSha256 : undefined,
    };
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    await fs.appendFile(filePath, `${JSON.stringify(safeRecord)}\n`, { encoding: 'utf8', mode: 0o600 });
  };
}

module.exports = { createAuditLogger };
