'use strict';

const crypto = require('node:crypto');
const Anthropic = require('@anthropic-ai/sdk');

const AGENTS = Object.freeze({
  'web-dominance': {
    name: 'WebDominanceAgent',
    role: 'Návrhový SEO a obsahový stratég',
    system: 'Jste WebDominanceAgent společnosti HOLUB Surface Protection Group. Odpovídejte výhradně kultivovanou, věcnou češtinou. Analyzujte pouze text, který vám administrátor výslovně předal; nepředstírejte přístup k webu, sitemapám ani výsledkům vyhledávačů. Navrhujte užitečné a originální úpravy s doložitelnými tvrzeními. Nikdy neslibujte první pozici, negenerujte hromadné dveřní stránky pro lokality a nezveřejňujte obsah. Výstup je interní návrh vyžadující lidskou kontrolu.',
  },
  'svj-lead': {
    name: 'FasadaScanAgent / SvjLeadAgent',
    role: 'Asistent přípravy interních podkladů pro SVJ',
    system: 'Jste FasadaScanAgent a SvjLeadAgent. Pište profesionální, neagresivní češtinou. Pracujte pouze s anonymizovaným textem dodaným administrátorem. Nemáte přístup k ARES, mapám, registrům ani skeneru; nevyhledávejte osobní údaje, kontakty předsedů ani konkrétní příjemce. Nevymýšlejte výměry, úspory ani údaj o 42% nárůstu nečistot. Připravte interní kontrolní seznam nebo návrh materiálu pro lidské posouzení; nic neodesílejte.',
  },
  'competitor-review': {
    name: 'CompetitorShieldAgent',
    role: 'Neutrální kontrola dodaného textového srovnání',
    system: 'Jste CompetitorShieldAgent. Posuzujte pouze textové úryvky, které administrátor vložil a smí zpracovat. Aplikace neprovádí OCR ani nepřijímá PDF. Oddělujte ověřená fakta, tvrzení dodavatele a chybějící údaje. Nepřisuzujte konkurentům pochybení, právní vady, nebezpečné postupy ani chybějící záruky bez předloženého důkazu. Nevytvářejte hanlivé či zdrcující texty; výstup musí být věcné interní srovnání pro lidskou kontrolu.',
  },
  'smart-booking': {
    name: 'SmartBookingAgent / LogisticsAgent',
    role: 'Asistent orientačního plánování a logistiky',
    system: 'Jste SmartBookingAgent a LogisticsAgent. Používejte jen meteorologické, termínové a materiálové údaje vložené administrátorem. Nemáte přístup k ČHMÚ, trasám, kalendáři ani skladu. Nevytvářejte rezervace, objednávky ani doporučení jako ověřenou předpověď. Vysvětlete nejistoty a navrhněte kontrolní kroky pro pracovníka; rozhodnutí a případná změna termínu vyžadují lidské schválení.',
  },
});

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function createAgentService({
  apiKey = process.env.ANTHROPIC_API_KEY,
  model = process.env.ANTHROPIC_MODEL,
  client,
} = {}) {
  const anthropicClient = client || (
    typeof apiKey === 'string' && apiKey
      ? new Anthropic({ apiKey, timeout: 15_000, maxRetries: 0 })
      : null
  );

  return {
    list() {
      return Object.entries(AGENTS).map(([id, agent]) => ({
        id,
        name: agent.name,
        role: agent.role,
        providerConfigured: Boolean(anthropicClient && model),
        humanReviewRequired: true,
        externalActionsEnabled: false,
      }));
    },

    async run(agentId, { input, externalProcessingConsent } = {}) {
      const agent = AGENTS[agentId];
      if (!agent) throw new TypeError('Požadovaný agent neexistuje.');
      if (typeof input !== 'string' || !input.trim() || input.length > 4000) {
        throw new TypeError('Vložte neprázdný text do 4 000 znaků.');
      }
      if (externalProcessingConsent !== true) {
        throw new TypeError('Před odesláním textu poskytovateli je nutné potvrdit informovaný souhlas.');
      }
      if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(input)) {
        throw new TypeError('Vstup obsahuje e-mailovou adresu. Odstraňte osobní údaje a použijte anonymizovaný text.');
      }
      if (!anthropicClient || typeof model !== 'string' || !model.trim()) {
        const error = new Error('Claude API není nakonfigurováno.');
        error.statusCode = 503;
        throw error;
      }

      const prompt = input.trim();
      const response = await anthropicClient.messages.create({
        model,
        max_tokens: 1200,
        system: agent.system,
        messages: [{ role: 'user', content: prompt }],
      });
      const draft = Array.isArray(response.content)
        ? response.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n').trim()
        : '';
      if (!draft) throw new Error('Poskytovatel nevrátil textový návrh.');
      return {
        agentId,
        draft: draft.slice(0, 12_000),
        provider: 'anthropic',
        model,
        promptSha256: sha256(prompt),
        outputSha256: sha256(draft),
        approved: false,
        dispatched: false,
      };
    },
  };
}

module.exports = { AGENTS, createAgentService };
