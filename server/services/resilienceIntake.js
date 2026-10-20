'use strict';

const crypto = require('node:crypto');

const MAX_REVIEW_ITEMS = 500;
const MAX_PHOTOS_PER_JOB = 10;
const MAX_TOTAL_PHOTO_RECORDS = 5000;
const REQUIRED_HANDOFF_PHOTOS = 3;

function fileKind(file) {
  const bytes = file?.buffer;
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) return null;
  const mime = file.mimetype;
  if (mime === 'application/pdf' && bytes.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (
    mime === 'image/jpeg' &&
    bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  ) return 'image/jpeg';
  if (
    mime === 'image/png' &&
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'image/png';
  if (
    mime === 'image/webp' &&
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) return 'image/webp';
  return null;
}

class ResilienceIntake {
  constructor({
    maxReviewItems = MAX_REVIEW_ITEMS,
    maxPhotosPerJob = MAX_PHOTOS_PER_JOB,
    maxTotalPhotoRecords = MAX_TOTAL_PHOTO_RECORDS,
  } = {}) {
    this.maxReviewItems = maxReviewItems;
    this.maxPhotosPerJob = maxPhotosPerJob;
    this.maxTotalPhotoRecords = maxTotalPhotoRecords;
    this.addressReviews = new Map();
    this.competitorReviews = new Map();
    this.photosByEstimate = new Map();
  }

  addAddressReview(address) {
    if (this.addressReviews.size >= this.maxReviewItems) {
      const oldestId = this.addressReviews.keys().next().value;
      this.addressReviews.delete(oldestId);
    }
    const item = {
      requestId: crypto.randomUUID(),
      address: typeof address === 'string' ? address.trim().slice(0, 300) : '',
      priority: 'critical',
      createdAt: new Date().toISOString(),
      status: 'awaiting-manual-address-review',
      notification: 'CRITICAL: Ruční satelitní revize nutná pro zakázku',
    };
    this.addressReviews.set(item.requestId, item);
    return { ...item };
  }

  listAddressReviews(limit = 100) {
    return [...this.addressReviews.values()].reverse().slice(0, limit).map((item) => ({ ...item }));
  }

  addCompetitorDocument(file) {
    const detectedType = fileKind(file);
    if (!detectedType) {
      throw new TypeError('Soubor neodpovídá deklarovanému typu PDF, JPEG, PNG nebo WebP.');
    }
    if (this.competitorReviews.size >= this.maxReviewItems) {
      throw new RangeError('Fronta ruční kontroly dokumentů je dočasně plná.');
    }
    const caseId = crypto.randomUUID();
    const item = {
      caseId,
      mediaType: detectedType,
      sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
      createdAt: new Date().toISOString(),
      status: 'awaiting-human-review-ocr-unavailable',
    };
    this.competitorReviews.set(caseId, item);
    return {
      ...item,
      ocrPerformed: false,
      automatedFindings: [],
      comparisonChecklist: [
        'Rozsah prací a doložené plochy',
        'Popsaný technologický postup a vhodnost pro konkrétní povrch',
        'Výslovně uvedené záruční podmínky a jejich omezení',
        'Cena, výluky a podmínky předání',
      ],
      message: 'Soubor byl přijat pouze k ruční kontrole. OCR není nakonfigurováno; nejsou vyvozena žádná zjištění ani právní závěry o konkurentovi.',
    };
  }

  addCompletionPhotos(estimateId, files) {
    if (!Array.isArray(files) || files.length < 1) {
      throw new TypeError('Vyberte alespoň jednu fotografii dokončené práce.');
    }
    const existing = this.photosByEstimate.get(estimateId) || [];
    if (existing.length + files.length > this.maxPhotosPerJob) {
      throw new RangeError(`Pro jednu zakázku lze evidovat nejvýše ${this.maxPhotosPerJob} fotografií.`);
    }
    const totalPhotos = [...this.photosByEstimate.values()].reduce((total, photos) => total + photos.length, 0);
    if (totalPhotos + files.length > this.maxTotalPhotoRecords) {
      throw new RangeError('Kapacita evidence fotografií je dočasně vyčerpána.');
    }

    const additions = files.map((file) => {
      const detectedType = fileKind(file);
      if (!detectedType || !detectedType.startsWith('image/')) {
        throw new TypeError('Předávací protokol přijímá pouze platné fotografie JPEG, PNG nebo WebP.');
      }
      return {
        sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
        mediaType: detectedType,
        receivedAt: new Date().toISOString(),
      };
    });
    const existingHashes = new Set(existing.map((photo) => photo.sha256));
    for (const photo of additions) {
      if (existingHashes.has(photo.sha256)) {
        throw new TypeError('Každá fotografie předávacího protokolu musí být obsahově jedinečná.');
      }
      existingHashes.add(photo.sha256);
    }
    const photos = [...existing, ...additions];
    this.photosByEstimate.set(estimateId, photos);
    return {
      estimateId,
      photoCount: photos.length,
      requiredPhotoCount: REQUIRED_HANDOFF_PHOTOS,
      eligibleForFinalSignatureReview: photos.length >= REQUIRED_HANDOFF_PHOTOS,
      evidence: additions.map(({ sha256, mediaType, receivedAt }) => ({ sha256, mediaType, receivedAt })),
      imageBytesPersisted: false,
    };
  }

  photoCount(estimateId) {
    return this.photosByEstimate.get(estimateId)?.length || 0;
  }
}

module.exports = {
  MAX_PHOTOS_PER_JOB,
  REQUIRED_HANDOFF_PHOTOS,
  ResilienceIntake,
  fileKind,
};
