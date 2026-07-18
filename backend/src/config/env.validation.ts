import { plainToInstance } from 'class-transformer';
import { IsEmail, IsIn, IsNumber, IsString, MinLength, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV!: string;

  @IsNumber()
  PORT!: number;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_HOST!: string;

  @IsNumber()
  REDIS_PORT!: number;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsEmail()
  ADMIN_EMAIL!: string;

  @IsString()
  @MinLength(8)
  ADMIN_PASSWORD!: string;

  @IsString()
  CORS_ORIGIN!: string;

  @IsString()
  LIBRARY_PATH!: string;

  @IsString()
  DOWNLOAD_TMP_PATH!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }

  return validated;
}
