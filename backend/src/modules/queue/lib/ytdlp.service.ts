import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { YtDlpDownloadResult, YtDlpEntry } from '../interfaces/ytdlp-entry.interface';

interface FlatPlaylistEntry {
  url?: string;
  webpage_url?: string;
  title?: string;
  uploader?: string;
  playlist_index?: number;
}

@Injectable()
export class YtDlpService {
  async probeEntries(url: string): Promise<YtDlpEntry[]> {
    const lines = await this.runCapture(['--flat-playlist', '--dump-json', '--no-warnings', url]);

    return lines
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const data = JSON.parse(line) as FlatPlaylistEntry;
        return {
          url: data.url ?? data.webpage_url ?? url,
          title: data.title,
          uploader: data.uploader,
          playlistIndex: data.playlist_index,
        };
      });
  }

  download(
    url: string,
    options: { format: string; quality: string; outputDir: string },
    onProgress: (percent: number) => void,
  ): Promise<YtDlpDownloadResult> {
    const args = [
      '-x',
      '--audio-format',
      options.format,
      '--audio-quality',
      options.quality,
      '--no-playlist',
      '--newline',
      '--no-warnings',
      '-o',
      `${options.outputDir}/%(id)s.%(ext)s`,
      '--print',
      'after_move:filepath',
      url,
    ];

    return new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', args);
      let filePath = '';
      const stderrChunks: string[] = [];

      const rl = createInterface({ input: child.stdout });
      rl.on('line', (line) => {
        const progressMatch = /\[download\]\s+(\d+(?:\.\d+)?)%/.exec(line);
        if (progressMatch) {
          onProgress(Number(progressMatch[1]));
          return;
        }
        if (line.trim().length > 0 && !line.startsWith('[')) {
          filePath = line.trim();
        }
      });

      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk.toString()));
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderrChunks.join('')}`));
          return;
        }
        if (!filePath) {
          reject(new Error('yt-dlp did not report a final file path'));
          return;
        }
        resolve({ filePath });
      });
    });
  }

  private runCapture(args: string[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', args);
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];

      child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk.toString()));
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk.toString()));

      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderrChunks.join('')}`));
          return;
        }
        resolve(stdoutChunks.join('').split('\n'));
      });
    });
  }
}
