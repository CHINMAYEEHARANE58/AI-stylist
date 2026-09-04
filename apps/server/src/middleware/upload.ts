import multer from 'multer';
import type { Request } from 'express';
import { AppError } from '../utils/AppError';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    cb(new AppError('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.', 422));
    return;
  }
  cb(null, true);
}

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES, files: 1 },
}).single('image');

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES, files: 5 },
}).array('images', 5);
