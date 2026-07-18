import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export async function getDirectorySizeBytes(dirPath: string): Promise<number> {
  let total = 0;
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += await getDirectorySizeBytes(entryPath);
    } else if (entry.isFile()) {
      const stats = await stat(entryPath).catch(() => null);
      total += stats?.size ?? 0;
    }
  }

  return total;
}
