import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// ============================================================
// File upload middleware using multer (memory storage).
// Files are held in memory as Buffer objects and passed directly
// to the CSV/Excel parser — no disk I/O required.
// ============================================================

const MAX_FILE_SIZE_BYTES =
  (parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10) || 10) * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',                               // Some clients send CSV as text/plain
  'application/vnd.ms-excel',                 // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
]);

const ALLOWED_EXTENSIONS = /\.(csv|xls|xlsx)$/i;

/**
 * Rejects files that are not CSV or Excel by mime-type AND extension.
 * Dual check prevents MIME spoofing.
 */
function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void {
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk  = ALLOWED_EXTENSIONS.test(file.originalname);

  if (mimeOk || extOk) {
    callback(null, true);
  } else {
    callback(
      new Error(
        `Unsupported file type: ${file.mimetype}. Please upload a .csv, .xls, or .xlsx file.`
      )
    );
  }
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});
