import { BadRequestException } from '@nestjs/common';
import {
  MAX_REVIEW_ATTACHMENT_BYTES,
  MAX_REVIEW_ATTACHMENT_FILES,
  parseReviewAttachments,
  validateReviewAttachmentFiles,
} from './review-attachments';

describe('review attachments', () => {
  it('accepts genuine images and PDF files within the combined 10 MB limit', () => {
    expect(() => validateReviewAttachmentFiles([
      { mimetype: 'image/jpeg', size: 3, buffer: Buffer.from([0xff, 0xd8, 0xff]) },
      { mimetype: 'application/pdf', size: 8, buffer: Buffer.from('%PDF-1.7') },
    ])).not.toThrow();
  });

  it('rejects files when their combined size exceeds 10 MB', () => {
    expect(() => validateReviewAttachmentFiles([
      { mimetype: 'application/pdf', size: MAX_REVIEW_ATTACHMENT_BYTES, buffer: Buffer.from('%PDF-') },
      { mimetype: 'image/jpeg', size: 1, buffer: Buffer.from([0xff, 0xd8, 0xff]) },
    ])).toThrow(BadRequestException);
  });

  it('rejects more than the allowed number of files', () => {
    const files = Array.from({ length: MAX_REVIEW_ATTACHMENT_FILES + 1 }, () => ({
      mimetype: 'application/pdf',
      size: 5,
      buffer: Buffer.from('%PDF-'),
    }));
    expect(() => validateReviewAttachmentFiles(files)).toThrow(
      `แนบไฟล์ได้ไม่เกิน ${MAX_REVIEW_ATTACHMENT_FILES} ไฟล์ต่อการทบทวน`,
    );
  });

  it('rejects disguised or unsupported files', () => {
    expect(() => validateReviewAttachmentFiles([
      { mimetype: 'application/pdf', size: 4, buffer: Buffer.from('MZ!!') },
    ])).toThrow('เนื้อหาไฟล์ไม่ตรงกับชนิดรูปภาพหรือ PDF ที่อนุญาต');
    expect(() => validateReviewAttachmentFiles([
      { mimetype: 'text/plain', size: 4, buffer: Buffer.from('text') },
    ])).toThrow('รองรับเฉพาะไฟล์ JPG, PNG, WebP และ PDF');
  });

  it('parses valid stored metadata and ignores malformed values', () => {
    const attachment = { filename: '7-proof.pdf', originalname: 'proof.pdf', mimetype: 'application/pdf', size: 100 };
    expect(parseReviewAttachments(JSON.stringify([attachment]))).toEqual([attachment]);
    expect(parseReviewAttachments('not-json')).toEqual([]);
  });
});
