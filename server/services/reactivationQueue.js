'use strict';

const crypto = require('node:crypto');

class ReactivationQueue {
  constructor({ retentionMs = 72 * 60 * 60 * 1000 } = {}) {
    this.retentionMs = retentionMs;
    this.entries = new Map();
  }

  register({ estimateId, contact, followUpConsent, now = Date.now() }) {
    if (typeof estimateId !== 'string' || !estimateId) throw new TypeError('Chybí identifikátor kalkulace.');
    if (followUpConsent !== true) throw new TypeError('Následný kontakt vyžaduje výslovný souhlas.');
    if (
      typeof contact !== 'string' ||
      contact.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
    ) {
      throw new TypeError('Zadejte platnou e-mailovou adresu.');
    }
    const id = crypto.randomUUID();
    this.entries.set(id, {
      id,
      estimateId,
      contact,
      createdAt: now,
      expiresAt: now + this.retentionMs,
      state: 'waiting',
    });
    return { id, state: 'waiting', sendsAutomatically: false };
  }

  getPendingForReview({ now = Date.now() } = {}) {
    const due = [];
    for (const [id, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(id);
      } else if (entry.state === 'waiting' && now - entry.createdAt >= 48 * 60 * 60 * 1000) {
        entry.state = 'awaiting-human-review';
        due.push({ ...entry });
      }
    }
    return due;
  }
}

module.exports = { ReactivationQueue };
