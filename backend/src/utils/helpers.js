import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Human friendly booking reference, e.g. IMV-7KQ2M9XA */
export function generateBookingReference() {
  const bytes = crypto.randomBytes(8);
  let ref = '';
  for (const byte of bytes) ref += REF_ALPHABET[byte % REF_ALPHABET.length];
  return `IMV-${ref}`;
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
}

export function assertObjectId(id, label = 'Resource') {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound(`${label} not found`);
}

export function paginate(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 12));
  return { page, limit, skip: (page - 1) * limit };
}
