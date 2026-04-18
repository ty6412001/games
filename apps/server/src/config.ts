import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AppConfig {
  port: number;
  databasePath: string;
  jwtSecret: string;
  familyPassword: string;
  appVersion: string;
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const readString = (value: string | undefined, fallback: string): string => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
};

const parsePort = (value: string | undefined): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3001;
};

const resolveDatabasePath = (value: string | undefined): string => {
  const normalized = value?.trim();
  if (!normalized) {
    return resolve(packageRoot, 'data', 'family.db');
  }
  return isAbsolute(normalized) ? normalized : resolve(packageRoot, normalized);
};

export const getConfig = (): AppConfig => ({
  port: parsePort(process.env.PORT),
  databasePath: resolveDatabasePath(process.env.DATABASE_PATH),
  jwtSecret: readString(process.env.JWT_SECRET, 'dev-jwt-secret'),
  familyPassword: readString(process.env.FAMILY_PASSWORD, 'family-dev-password'),
  appVersion: readString(process.env.npm_package_version, '0.1.0'),
});
