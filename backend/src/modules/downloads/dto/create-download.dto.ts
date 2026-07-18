import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, IsUrl, Matches } from 'class-validator';

export enum AudioFormat {
  MP3 = 'mp3',
  FLAC = 'flac',
  OPUS = 'opus',
  M4A = 'm4a',
  WAV = 'wav',
}

export const AUDIO_QUALITIES = ['0', '128K', '192K', '256K', '320K'] as const;

export class CreateDownloadDto {
  @ApiProperty({
    type: [String],
    description: 'One or more URLs supported by yt-dlp. A playlist URL expands into one job per track.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl({ require_tld: false }, { each: true })
  urls!: string[];

  @ApiProperty({ enum: AudioFormat })
  @IsIn(Object.values(AudioFormat))
  format!: AudioFormat;

  @ApiProperty({ enum: AUDIO_QUALITIES })
  @IsIn(AUDIO_QUALITIES)
  quality!: (typeof AUDIO_QUALITIES)[number];

  @ApiPropertyOptional({ description: 'Subfolder inside the library to place the result in' })
  @IsOptional()
  @IsString()
  @Matches(/^[^\0]*$/, { message: 'destinationFolder must not contain null bytes' })
  @Matches(/^(?!\/)(?!.*\.\.).*$/, {
    message: 'destinationFolder must be a relative path with no ".." segments',
  })
  destinationFolder?: string;

  @ApiPropertyOptional({ description: 'Only allowed when a single track results from this request' })
  @IsOptional()
  @IsString()
  customTitle?: string;
}
