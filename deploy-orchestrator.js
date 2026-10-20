'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const requiredDirectories = ['server/logs', 'public', 'documents'];
const requiredAuditFields = ['timestamp', 'eventId', 'type', 'amountCzk', 'outcome'];
const assistantDisclosure = 'Dobrý den, jsem automatizovaný asistent HOLUB Core';

async function checkDirectory(relativePath, baseDirectory = root) {
  try {
    const details = await fs.stat(path.join(baseDirectory, relativePath));
    return { path: relativePath, ok: details.isDirectory() };
  } catch (error) {
    if (error.code === 'ENOENT') return { path: relativePath, ok: false };
    throw error;
  }
}

async function checkAuditLog(baseDirectory = root) {
  const filePath = path.join(baseDirectory, 'server', 'logs', 'ai_compliance.log');
  let details;
  try {
    details = await fs.lstat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ok: false, status: 'missing', detail: 'Auditní soubor dosud neexistuje; integritu nelze ověřit.' };
    }
    throw error;
  }

  if (!details.isFile() || details.isSymbolicLink()) {
    return { ok: false, status: 'invalid', detail: 'Cesta auditního logu není běžný soubor.' };
  }
  if ((details.mode & 0o077) !== 0) {
    return { ok: false, status: 'permissions', detail: 'Auditní log má příliš otevřená oprávnění; požadován je přístup pouze vlastníka.' };
  }

  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  if (lines.at(-1) === '') lines.pop();
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim()) {
      return { ok: false, status: 'invalid', detail: `Auditní log obsahuje prázdný řádek č. ${index + 1}.` };
    }
    let record;
    try {
      record = JSON.parse(lines[index]);
    } catch {
      return { ok: false, status: 'invalid', detail: `Auditní řádek č. ${index + 1} není platný JSON.` };
    }
    if (
      !record || typeof record !== 'object' ||
      requiredAuditFields.some((field) => !Object.hasOwn(record, field)) ||
      typeof record.timestamp !== 'string' || !Number.isFinite(Date.parse(record.timestamp)) ||
      typeof record.eventId !== 'string' || typeof record.type !== 'string' ||
      typeof record.outcome !== 'string' ||
      (record.amountCzk !== null && !Number.isFinite(record.amountCzk))
    ) {
      return { ok: false, status: 'invalid', detail: `Auditní záznam č. ${index + 1} neodpovídá očekávané struktuře.` };
    }
  }

  return {
    ok: true,
    status: 'structurally-valid',
    detail: `Strukturální kontrola prošla (${lines.length} záznamů); kryptografickou nezměnitelnost ani soulad s právními předpisy tato kontrola neověřuje.`,
  };
}

async function checkTransparency(baseDirectory = root) {
  const [serverSource, cockpitSource] = await Promise.all([
    fs.readFile(path.join(baseDirectory, 'server.js'), 'utf8'),
    fs.readFile(path.join(baseDirectory, 'public', 'admin-cockpit.html'), 'utf8'),
  ]);
  const backendDisclosesAssistant = serverSource.includes(assistantDisclosure) &&
    serverSource.includes("app.get('/api/hbot/hello'");
  const adminUiDisclosesAutomation = cockpitSource.includes(assistantDisclosure);
  return {
    ok: backendDisclosesAssistant && adminUiDisclosesAutomation,
    detail: backendDisclosesAssistant && adminUiDisclosesAutomation
      ? 'Oznamovací text je přítomen v H-BOT handleru i administračním rozhraní; nejde o právní certifikaci.'
      : 'Chybí kontrolovaný oznamovací text v H-BOT handleru nebo administračním rozhraní.',
  };
}

async function run(baseDirectory = root) {
  console.log('HOLUB 360 — kontrola provozních předpokladů');
  console.log('Tato kontrola nepotvrzuje produkční připravenost, právní soulad ani připravenost ostrého spuštění.');

  const directoryChecks = await Promise.all(
    requiredDirectories.map((relativePath) => checkDirectory(relativePath, baseDirectory)),
  );
  for (const result of directoryChecks) {
    console.log(`${result.ok ? 'OK' : 'CHYBÍ'} adresář: ${result.path}`);
  }

  const audit = await checkAuditLog(baseDirectory);
  console.log(`${audit.ok ? 'OK' : 'NELZE OVĚŘIT'} auditní log: ${audit.detail}`);
  const transparency = await checkTransparency(baseDirectory);
  console.log(`${transparency.ok ? 'OK' : 'CHYBA'} automatizované rozhraní: ${transparency.detail}`);
  console.log('Kontrola logu ověřuje pouze strukturu JSONL a oprávnění souboru, nikoli odolnost proti pozměnění.');
  console.log('Živé integrace poskytovatelů, ochrana přístupů, provozní monitoring a produkční nasazení vyžadují samostatné ověření.');

  const readyForFurtherReview = directoryChecks.every((result) => result.ok) && audit.ok && transparency.ok;
  console.log(`Výsledek předběžné kontroly: ${readyForFurtherReview ? 'základní kontroly prošly; nutná další provozní kontrola' : 'neúplné — ostré nasazení není potvrzeno'}`);
  if (!readyForFurtherReview) process.exitCode = 1;
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Kontrolu se nepodařilo dokončit:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { checkAuditLog, checkDirectory, checkTransparency, run };
