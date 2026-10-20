'use strict';

function validCoordinates(value) {
  return value &&
    Number.isFinite(value.latitude) && value.latitude >= -90 && value.latitude <= 90 &&
    Number.isFinite(value.longitude) && value.longitude >= -180 && value.longitude <= 180;
}

function distanceKm(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const firstLatitude = radians(from.latitude);
  const secondLatitude = radians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function verifiedEvidenceUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function findNearestVerifiedReference(location, references) {
  if (!validCoordinates(location) || !Array.isArray(references)) return null;
  let nearest = null;
  for (const reference of references) {
    if (
      !reference ||
      reference.verified !== true ||
      typeof reference.id !== 'string' ||
      typeof reference.title !== 'string' ||
      !validCoordinates(reference.coordinates)
    ) continue;
    const distance = distanceKm(location, reference.coordinates);
    if (!nearest || distance < nearest.distanceKm) {
      nearest = {
        id: reference.id,
        title: reference.title,
        locality: typeof reference.locality === 'string' ? reference.locality : null,
        evidenceUrl: verifiedEvidenceUrl(reference.evidenceUrl),
        distanceKm: Math.round(distance * 10) / 10,
      };
    }
  }
  return nearest;
}

module.exports = { findNearestVerifiedReference, verifiedEvidenceUrl };
