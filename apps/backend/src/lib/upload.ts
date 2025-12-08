import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  const uploadsDir = path.join(process.cwd(), 'uploads', subdirectory, cooperativeId);
  await fs.mkdir(uploadsDir, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}-${sanitizedOriginalName}`;
  const filePath = path.join(uploadsDir, fileName);

  // Write file to disk
  await fs.writeFile(filePath, file.buffer);

  // Return relative path for storage in database
  const relativePath = `/uploads/${subdirectory}/${cooperativeId}/${fileName}`;

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
  return path.join(process.cwd(), cleanPath);
}
