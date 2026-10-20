'use strict';

const COPPERGUARD_BASE_PRICE_CZK = 1490;
const COPPERGUARD_INCLUDED_METERS = 4;
const COPPERGUARD_ADDITIONAL_METER_CZK = 290;
const SVJ_WINDOW_COVER_RATE_PER_M2 = 20;

function validateDiscountPercent(value) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new TypeError('Cechovní sleva pro SVJ musí být číslo v rozmezí 0–100 %.');
  }
  return value;
}

function calculateCopperGuard(ridgeLengthM) {
  if (!Number.isFinite(ridgeLengthM) || ridgeLengthM <= 0 || ridgeLengthM > 1000) {
    return {
      available: false,
      verifiedRidgeLengthM: null,
      priceCzk: null,
      status: 'ridge-length-not-verified',
    };
  }
  const billableAdditionalMeters = Math.ceil(Math.max(0, ridgeLengthM - COPPERGUARD_INCLUDED_METERS));
  return {
    available: true,
    verifiedRidgeLengthM: ridgeLengthM,
    includedMeters: COPPERGUARD_INCLUDED_METERS,
    billableAdditionalMeters,
    priceCzk: COPPERGUARD_BASE_PRICE_CZK + billableAdditionalMeters * COPPERGUARD_ADDITIONAL_METER_CZK,
    status: 'indicative-price-requires-operator-confirmation',
    description: 'Měď shora, H-STONE zdola. Ochrana, která pracuje s deštěm bez elektřiny a údržby.',
  };
}

function splitIntoThirds(amount) {
  const firstTwo = Math.floor((amount / 3) * 100) / 100;
  return [firstTwo, firstTwo, Math.round((amount - firstTwo * 2) * 100) / 100];
}

function buildVerifiedSavingsScenario(scenario) {
  if (
    !scenario ||
    scenario.verified !== true ||
    typeof scenario.sourceName !== 'string' ||
    !scenario.sourceName.trim() ||
    scenario.sourceName.length > 120 ||
    typeof scenario.evidenceUrl !== 'string' ||
    !scenario.evidenceUrl.startsWith('https://') ||
    !Array.isArray(scenario.hspgAnnualCostsCzk) ||
    !Array.isArray(scenario.delayAnnualCostsCzk) ||
    scenario.hspgAnnualCostsCzk.length < 2 ||
    scenario.hspgAnnualCostsCzk.length > 30 ||
    scenario.hspgAnnualCostsCzk.length !== scenario.delayAnnualCostsCzk.length
  ) return null;
  let evidenceUrl;
  try {
    const parsed = new URL(scenario.evidenceUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    evidenceUrl = parsed.href;
  } catch {
    return null;
  }

  const validCosts = (costs) =>
    costs.every((cost) => Number.isFinite(cost) && cost >= 0 && cost <= 1_000_000_000);
  if (!validCosts(scenario.hspgAnnualCostsCzk) || !validCosts(scenario.delayAnnualCostsCzk)) return null;

  const hspgTotalCzk = scenario.hspgAnnualCostsCzk.reduce((total, cost) => total + cost, 0);
  const delayTotalCzk = scenario.delayAnnualCostsCzk.reduce((total, cost) => total + cost, 0);
  if (delayTotalCzk <= 0 || !Number.isFinite(hspgTotalCzk)) return null;

  return {
    status: 'verified-source-scenario',
    sourceName: scenario.sourceName.trim(),
    evidenceUrl,
    horizonYears: scenario.hspgAnnualCostsCzk.length,
    hspgAnnualCostsCzk: [...scenario.hspgAnnualCostsCzk],
    delayAnnualCostsCzk: [...scenario.delayAnnualCostsCzk],
    hspgTotalCzk,
    delayTotalCzk,
    savingsPercent: Math.round(((delayTotalCzk - hspgTotalCzk) / delayTotalCzk) * 1000) / 10,
  };
}

function applyContentPriceMatrix(estimate, {
  buildingProfile = null,
  svjGuildDiscountPercent = null,
} = {}) {
  if (svjGuildDiscountPercent !== null) validateDiscountPercent(svjGuildDiscountPercent);
  const appliedDiscountPercent = svjGuildDiscountPercent ?? 0;
  const copperGuard = calculateCopperGuard(
    buildingProfile?.verified === true ? buildingProfile.roofRidgeLengthM : null,
  );
  const isVerifiedApartmentBuilding =
    buildingProfile?.verified === true &&
    buildingProfile?.buildingType === 'apartment-building';

  const result = {
    ...estimate,
    copperGuard,
    buildingProfile: isVerifiedApartmentBuilding
      ? { verified: true, buildingType: 'apartment-building' }
      : { verified: false, buildingType: null },
    socialProof: {
      status: 'no-verified-reference-available',
      reference: null,
      message: 'Pro tuto lokalitu není v systému dostupná ověřená reference.',
    },
  };
  if (!isVerifiedApartmentBuilding) {
    result.housingCooperative = {
      eligible: false,
      status: 'building-type-not-verified',
    };
    return result;
  }

  const basePrice = estimate.pricing.totalPrice;
  const windowCoverPrice = Math.round(estimate.area.windowsDeductedM2 * SVJ_WINDOW_COVER_RATE_PER_M2);
  const subtotal = basePrice + windowCoverPrice;
  const guildDiscount = Math.round(subtotal * appliedDiscountPercent / 100);
  const totalPrice = subtotal - guildDiscount;
  const deposit = totalPrice <= 100000 ? 0 : Math.round(totalPrice * 0.3);

  result.pricing = {
    ...estimate.pricing,
    windowCoverRatePerM2: SVJ_WINDOW_COVER_RATE_PER_M2,
    windowCoverPrice,
    svjGuildDiscountPercent: svjGuildDiscountPercent,
    svjGuildDiscount: guildDiscount,
    totalPrice,
    deposit,
    balanceDue: totalPrice - deposit,
    threeInstallmentsIllustration: splitIntoThirds(totalPrice),
  };
  result.housingCooperative = {
    eligible: true,
    status: 'verified-apartment-building-model-pricing',
    windowCoverRatePerM2: SVJ_WINDOW_COVER_RATE_PER_M2,
    windowCoverPrice,
    guildDiscountPercent: svjGuildDiscountPercent,
    guildDiscountConfigured: svjGuildDiscountPercent !== null,
    guildDiscount,
    priceBeforeDiscount: subtotal,
    totalPrice,
    delayCostScenario: {
      amountCzk: null,
      status: 'not-quantified-unsupported-growth-claim',
      message: 'Cena odkladu nelze spolehlivě vyčíslit bez doložených dat o konkrétním objektu a nákladech.',
    },
    savingsScenario: buildVerifiedSavingsScenario(buildingProfile.svjSavingsScenario),
  };
  return result;
}

module.exports = {
  COPPERGUARD_ADDITIONAL_METER_CZK,
  COPPERGUARD_BASE_PRICE_CZK,
  COPPERGUARD_INCLUDED_METERS,
  SVJ_WINDOW_COVER_RATE_PER_M2,
  applyContentPriceMatrix,
  buildVerifiedSavingsScenario,
  calculateCopperGuard,
  validateDiscountPercent,
};
