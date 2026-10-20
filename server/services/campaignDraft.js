'use strict';

function buildCampaignDraft({ latitude, longitude, workConfirmed, consent }) {
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new TypeError('GPS souřadnice nejsou platné.');
  }
  if (workConfirmed !== true || consent !== true) {
    throw new TypeError('Návrh reklamy vyžaduje potvrzenou probíhající zakázku a souhlas.');
  }

  const common = {
    radiusKm: 5,
    location: { latitude, longitude },
    text: 'Právě pracujeme ve vaší ulici!',
    requiresHumanApproval: true,
    sentToAdPlatforms: false,
  };
  return {
    meta: { ...common, platform: 'meta', targeting: 'draft-only' },
    googleAds: { ...common, platform: 'google-ads', targeting: 'draft-only' },
  };
}

module.exports = { buildCampaignDraft };
