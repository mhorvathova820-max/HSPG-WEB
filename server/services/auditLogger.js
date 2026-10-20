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
    };
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    await fs.appendFile(filePath, `${JSON.stringify(safeRecord)}\n`, { encoding: 'utf8', mode: 0o600 });
  };
}

module.exports = { createAuditLogger };
