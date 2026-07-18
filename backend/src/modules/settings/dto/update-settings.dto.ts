import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const LANGUAGES = ['pt-BR', 'en'] as const;
const THEMES = ['dark', 'light'] as const;

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Absolute path to the media library root' })
  @IsOptional()
  @IsString()
  libraryPath?: string;

  @ApiPropertyOptional({ description: 'Absolute path to the scratch/temp directory used during downloads' })
  @IsOptional()
  @IsString()
  downloadTmpPath?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allowedFormats?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultQuality?: string;

  @ApiPropertyOptional({ enum: LANGUAGES })
  @IsOptional()
  @IsIn(LANGUAGES)
  language?: (typeof LANGUAGES)[number];

  @ApiPropertyOptional({ enum: THEMES })
  @IsOptional()
  @IsIn(THEMES)
  theme?: (typeof THEMES)[number];

  @ApiPropertyOptional({ description: 'Takes effect on next backend restart' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxConcurrentDownloads?: number;
}
