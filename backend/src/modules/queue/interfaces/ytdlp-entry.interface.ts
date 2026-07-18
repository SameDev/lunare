export interface YtDlpEntry {
  url: string;
  title?: string;
  uploader?: string;
  playlistIndex?: number;
}

export interface YtDlpDownloadResult {
  filePath: string;
}
