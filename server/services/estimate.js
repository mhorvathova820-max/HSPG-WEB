'use strict';

const FACADE_RATE = 168;
const ROOF_RATE = 178;
const DEPOSIT_THRESHOLD = 100000;

function roundArea(value) {
  return Math.round(value * 100) / 100;
}

function splitIntoThirds(amount) {
  const firstTwo = Math.floor((amount / 3) * 100) / 100;
  return [firstTwo, firstTwo, Math.round((amount - firstTwo * 2) * 100) / 100];
}

function calculateEstimate(address) {
  if (typeof address !== 'string' || !address.trim() || address.trim().length > 300) {
    throw new TypeError('Adresa musí být neprázdný text do 300 znaků.');
  }

  // Transparentní modelový scénář; nejde o měření ani o satelitní sken.
  const facadeGrossM2 = 195;
  const windowsM2 = 39;
  const facadeNetM2 = roundArea(facadeGrossM2 - windowsM2);
  const roofGrossM2 = 93.6;
  const chimneysM2 = roundArea(roofGrossM2 * 0.02);
  const solarPanelsM2 = roundArea(roofGrossM2 * 0.05);
  const roofNetM2 = roundArea(roofGrossM2 - chimneysM2 - solarPanelsM2);
  const facadePrice = Math.round(facadeNetM2 * FACADE_RATE);
  const roofPrice = Math.round(roofNetM2 * ROOF_RATE);
  const totalPrice = facadePrice + roofPrice;
  const deposit = totalPrice <= DEPOSIT_THRESHOLD ? 0 : Math.round(totalPrice * 0.3);

  return {
    address: address.trim(),
    estimateType: 'illustrative-model-not-surveyed',
    measuredRemotely: false,
    area: {
      facadeGrossM2,
      windowsDeductedM2: windowsM2,
      facadeNetM2,
      roofGrossM2,
      chimneysDeductedM2: chimneysM2,
      solarPanelsDeductedM2: solarPanelsM2,
      roofNetM2,
    },
    pricing: {
      currency: 'CZK',
      vatStatus: 'operator-status-not-verified',
      facadeRatePerM2: FACADE_RATE,
      roofRatePerM2: ROOF_RATE,
      facadePrice,
      roofPrice,
      totalPrice,
      deposit,
      balanceDue: totalPrice - deposit,
      threeInstallmentsIllustration: splitIntoThirds(totalPrice),
      installmentProvider: null,
      creditApproval: false,
    },
    weather: {
      status: 'not-checked',
      recommendation: 'Termín ověřte podle aktuální předpovědi počasí.',
    },
    assumptions: [
      'Výměry jsou pevné modelové předpoklady, nikoli zjištění o uvedené nemovitosti.',
      'Výsledek nenahrazuje zaměření, prohlídku ani závaznou cenovou nabídku.',
      'Sazby a daňový režim musí před použitím potvrdit provozovatel.',
    ],
  };
}

function validateWeather(rainProbability, temperatureC) {
  if (
    !Number.isFinite(rainProbability) ||
    rainProbability < 0 ||
    rainProbability > 100 ||
    !Number.isFinite(temperatureC)
  ) {
    throw new TypeError('Zadejte pravděpodobnost srážek 0–100 a platnou teplotu.');
  }

  const unsuitable = rainProbability > 30 || temperatureC < 5;
  return {
    suitable: !unsuitable,
    recommendation: unsuitable
      ? 'Technologicky nevhodný den — doporučujeme přesun termínu.'
      : 'Zadané podmínky splňují orientační limity.',
    source: 'client-supplied-values-not-forecast',
  };
}

module.exports = { calculateEstimate, validateWeather };
