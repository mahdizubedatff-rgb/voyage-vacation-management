import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

fs.mkdirSync(env.UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype] ?? ".img"}`),
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(AppError.badRequest("Image must be a JPEG, PNG or WebP file"));
  },
}).single("image");

/** Checks the file signature so a renamed non-image cannot slip past the MIME check. */
export async function assertRealImage(filePath: string): Promise<void> {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const { buffer } = await handle.read(Buffer.alloc(12), 0, 12, 0);
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    if (!isJpeg && !isPng && !isWebp) throw AppError.badRequest("The uploaded file is not a valid image");
  } finally {
    await handle.close();
  }
}

export async function removeUpload(imageName: string | undefined | null): Promise<void> {
  if (!imageName) return;
  const target = path.join(env.UPLOADS_DIR, path.basename(imageName));
  await fs.promises.rm(target, { force: true });
}
