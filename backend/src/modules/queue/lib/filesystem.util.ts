import { copyFile, mkdir, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

export function sanitizeFilenameSegment(input: string, fallback: string): string {
  const sanitized = input
    .replace(/[/\\?%*:|"<>\0]/g, '')
    .trim()
    .slice(0, 150);
  return sanitized.length > 0 ? sanitized : fallback;
}

export async function moveFile(sourcePath: string, destPath: string): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true });
  try {
    await rename(sourcePath, destPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EXDEV') {
      await copyFile(sourcePath, destPath);
      await unlink(sourcePath);
      return;
    }
    throw error;
  }
}
