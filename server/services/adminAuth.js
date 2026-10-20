'use strict';

const crypto = require('node:crypto');

const TOKEN_ISSUER = 'holub360';
const TOKEN_AUDIENCE = 'holub360-admin';

function decodeSegment(segment) {
  if (!segment || !/^[A-Za-z0-9_-]+$/.test(segment)) throw new TypeError('Neplatný token.');
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

function verifyAdminToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    const error = new Error('Administrátorské ověření není nakonfigurováno.');
    error.statusCode = 503;
    throw error;
  }
  if (typeof token !== 'string' || token.length > 8192) throw new TypeError('Neplatný token.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new TypeError('Neplatný token.');

  const header = decodeSegment(parts[0]);
  const claims = decodeSegment(parts[1]);
  if (!header || header.alg !== 'HS256' || (header.typ && header.typ !== 'JWT')) {
    throw new TypeError('Neplatný token.');
  }

  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  let supplied;
  try {
    supplied = Buffer.from(parts[2], 'base64url');
  } catch {
    throw new TypeError('Neplatný token.');
  }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    throw new TypeError('Neplatný token.');
  }

  if (
    !claims || typeof claims !== 'object' ||
    claims.iss !== TOKEN_ISSUER ||
    !(claims.aud === TOKEN_AUDIENCE || (Array.isArray(claims.aud) && claims.aud.includes(TOKEN_AUDIENCE))) ||
    claims.role !== 'admin' ||
    typeof claims.sub !== 'string' || !claims.sub ||
    !Number.isFinite(claims.exp) || claims.exp <= nowSeconds ||
    (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > nowSeconds))
  ) {
    throw new TypeError('Neplatný nebo expirovaný token.');
  }
  return { subject: claims.sub, role: claims.role };
}

function createRateLimiter({ windowMs = 60_000, maxRequests = 60, now = Date.now } = {}) {
  const clients = new Map();
  return function rateLimit(req, res, next) {
    const currentTime = now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let record = clients.get(key);
    if (!record || record.expiresAt <= currentTime) {
      record = { count: 0, expiresAt: currentTime + windowMs };
      clients.set(key, record);
    }
    record.count += 1;
    if (clients.size > 2000) {
      for (const [client, value] of clients) {
        if (value.expiresAt <= currentTime) clients.delete(client);
      }
    }
    if (record.count > maxRequests) {
      res.set('Retry-After', String(Math.ceil((record.expiresAt - currentTime) / 1000)));
      return res.status(429).json({ error: 'Příliš mnoho administrátorských požadavků.' });
    }
    return next();
  };
}

module.exports = {
  TOKEN_AUDIENCE,
  TOKEN_ISSUER,
  createRateLimiter,
  verifyAdminToken,
};
