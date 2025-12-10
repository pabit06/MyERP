import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeFilename } from './sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

/**
 * Save uploaded file to disk
 */
export async function saveUploadedFile(
  file: Express.Multer.File,
  subdirectory: string,
  cooperativeId: string
): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  // Sanitize subdirectory and cooperativeId to prevent path traversal attacks
  const sanitizedSubdirectory = sanitizeFilename(subdirectory);
  const sanitizedCooperativeId = sanitizeFilename(cooperativeId);
  const uploadsDir = path.join(
    process.cwd(),
    'uploads',
    sanitizedSubdirectory,
    sanitizedCooperativeId
  );
  await fs.mkdir(uploadsDir, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}-${sanitizedOriginalName}`;
  const filePath = path.join(uploadsDir, fileName);

  // Write file to disk
  await fs.writeFile(filePath, file.buffer);

  // Return relative path for storage in database (use sanitized values)
  const relativePath = `/uploads/${sanitizedSubdirectory}/${sanitizedCooperativeId}/${fileName}`;

  return {
    filePath: relativePath,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  };
}

/**
 * Delete file from disk
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    // Remove leading slash if present
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const fullPath = path.join(process.cwd(), cleanPath);

    // Validate that the path is within the uploads directory to prevent path traversal
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(uploadsRoot);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error('Invalid file path: path must be within uploads directory');
    }

    await fs.unlink(fullPath);
  } catch (error: any) {
    // File might not exist, ignore error
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Get full file path for serving files
 */
export function getFullFilePath(relativePath: string): string {
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  const fullPath = path.join(process.cwd(), cleanPath);

  // Validate that the path is within the uploads directory to prevent path traversal
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const resolvedPath = path.resolve(fullPath);
  const resolvedRoot = path.resolve(uploadsRoot);

  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error('Invalid file path: path must be within uploads directory');
  }

  return fullPath;
}
