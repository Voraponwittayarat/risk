import { BadRequestException } from '@nestjs/common';

export const MAX_REVIEW_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_REVIEW_ATTACHMENT_FILES = 10;
export const REVIEW_ATTACHMENT_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export type ReviewAttachment = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

export function hasAllowedReviewAttachmentSignature(file: { mimetype: string; buffer: Buffer }): boolean {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.mimetype === 'image/png') {
    return bytes.length >= 8
      && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (file.mimetype === 'image/webp') {
    return bytes.length >= 12
      && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (file.mimetype === 'application/pdf') {
    return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  return false;
}

export function validateReviewAttachmentFiles(files: Array<{ mimetype: string; size: number; buffer: Buffer }>): void {
  if (files.length > MAX_REVIEW_ATTACHMENT_FILES) {
    throw new BadRequestException(`แนบไฟล์ได้ไม่เกิน ${MAX_REVIEW_ATTACHMENT_FILES} ไฟล์ต่อการทบทวน`);
  }
  const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  if (totalBytes > MAX_REVIEW_ATTACHMENT_BYTES) {
    throw new BadRequestException('ขนาดไฟล์แนบรวมต้องไม่เกิน 10 MB');
  }
  if (files.some((file) => !REVIEW_ATTACHMENT_EXTENSIONS[file.mimetype])) {
    throw new BadRequestException('รองรับเฉพาะไฟล์ JPG, PNG, WebP และ PDF');
  }
  if (files.some((file) => !hasAllowedReviewAttachmentSignature(file))) {
    throw new BadRequestException('เนื้อหาไฟล์ไม่ตรงกับชนิดรูปภาพหรือ PDF ที่อนุญาต');
  }
}

export function parseReviewAttachments(value: unknown): ReviewAttachment[] {
  if (!value) return [];
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is ReviewAttachment => Boolean(
    item && typeof item === 'object'
    && typeof (item as ReviewAttachment).filename === 'string'
    && typeof (item as ReviewAttachment).originalname === 'string'
    && typeof (item as ReviewAttachment).mimetype === 'string'
    && Number.isFinite(Number((item as ReviewAttachment).size)),
  ));
}
