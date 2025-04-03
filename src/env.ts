import sodium from 'sodium-native';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

// Define types for configuration variables
interface Config {
  TRADING_SIM_API_URL: string;
  DEBUG: boolean;
}

// Define logger interface
interface Logger {
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

// Redaction function with type safety (enhanced from previous)
const redactSensitive = (input: any): any => {
  if (typeof input === 'string') {
    return input
      .replace(/[0-9a-fA-F]{64}/g, '[REDACTED_KEY]') // Hex keys
      .replace(/[^=&\s]{32,}/g, '[REDACTED_LONG_VALUE]') // Long strings
      .replace(/(api_key|secret|key|token|password)=([^&\s]+)/gi, '$1=[REDACTED]');
  }
  if (input && typeof input === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
        ? '[REDACTED]'
        : redactSensitive(value);
    }
    return sanitized;
  }
  return input;
};

// Custom logger implementation
export const logger: Logger = {
  error: (...args: any[]) => process.stderr.write(`${chalk.red('[ERROR]')} ${args.map(redactSensitive).join(' ')}\n`),
  warn: (...args: any[]) => process.stderr.write(`${chalk.yellow('[WARN]')} ${args.map(redactSensitive).join(' ')}\n`),
  info: (...args: any[]) => process.stderr.write(`${chalk.blue('[INFO]')} ${args.map(redactSensitive).join(' ')}\n`),
};

// Secure secret storage
let secretBuffer: sodium.SecureBuffer | null = null;
let secretLoaded: boolean = false;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ENV_FILE_PATH: string = resolve(__dirname, '..', '.env');
const EXPECTED_ENV_HASH: string | null = process.env.ENV_FILE_HASH || null; // Optional integrity hash

// Load secrets (configurable for .env-only or external env priority)
const loadSecrets = (): void => {
  if (secretLoaded) return;

  // Option 2: External env priority (default, matches your latest recall setup)
  const externalKey: string | undefined = process.env.TRADING_SIM_API_KEY;
  if (externalKey) {
    secretBuffer = sodium.sodium_malloc(externalKey.length) as sodium.SecureBuffer;
    secretBuffer.write(externalKey);
    sodium.sodium_mlock(secretBuffer);
    process.env.TRADING_SIM_API_KEY = '[REDACTED]';
    logger.info('Using TRADING_SIM_API_KEY from external environment variables.');
    secretLoaded = true;
    return;
  }

  try {
    const envContent: string = readFileSync(ENV_FILE_PATH, 'utf8');
    if (EXPECTED_ENV_HASH) {
      const computedHash: string = createHash('sha256').update(envContent).digest('hex');
      if (computedHash !== EXPECTED_ENV_HASH) {
        throw new Error('Integrity check failed: .env file hash does not match expected value.');
      }
    }

    const envVars: Record<string, string> = envContent.split('\n').reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {} as Record<string, string>);

    const envKey: string | undefined = envVars.TRADING_SIM_API_KEY;
    if (!envKey) {
      throw new Error('TRADING_SIM_API_KEY not found in .env file.');
    }

    secretBuffer = sodium.sodium_malloc(envKey.length) as sodium.SecureBuffer;
    secretBuffer.write(envKey);
    sodium.sodium_mlock(secretBuffer);
    process.env.TRADING_SIM_API_KEY = '[REDACTED]';
    logger.info(`Loaded TRADING_SIM_API_KEY from .env file at: ${ENV_FILE_PATH}`);
    secretLoaded = true;
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load .env: ${message}`);
    throw new Error(`Cannot proceed without TRADING_SIM_API_KEY: ${message}`);
  }
};

// Initialize secrets
loadSecrets();

// Export configuration object
export const config: Config = {
  TRADING_SIM_API_URL: process.env.TRADING_SIM_API_URL || 'http://localhost:3000',
  DEBUG: process.env.DEBUG === 'true',
};

// Ensure URL doesn't have trailing slash
if (config.TRADING_SIM_API_URL.endsWith('/')) {
  config.TRADING_SIM_API_URL = config.TRADING_SIM_API_URL.slice(0, -1);
}

// Secure API key access
export function getApiKey(): string {
  if (!secretBuffer) {
    throw new Error('TRADING_SIM_API_KEY is required but not available.');
  }

  const key: string = secretBuffer.toString('utf8');
  sodium.sodium_memzero(secretBuffer);
  sodium.sodium_munlock(secretBuffer);
  secretBuffer = null;
  secretLoaded = false;
  return key;
}

// Validate environment
export function validateEnv(): void {
  if (!secretLoaded || !secretBuffer) {
    throw new Error('Missing required TRADING_SIM_API_KEY. Provide it via environment variables or .env.');
  }
  const recommendedVars: (keyof Config)[] = ['TRADING_SIM_API_URL', 'DEBUG'];
  const missing: string[] = recommendedVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    logger.warn(`Missing recommended variables: ${missing.join(', ')}. Using defaults.`);
  }
}

// Debug startup message
if (config.DEBUG) {
  logger.info('Starting environment setup...');
}