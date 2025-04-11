import sodium from 'sodium-native';
import chalk from 'chalk';

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

// Redaction function with type safety
const redactSensitive = (input: any): any => {
  if (typeof input === 'string') {
    return input
      .replace(/[0-9a-fA-F]{64}/g, '[REDACTED_KEY]')
      .replace(/[^=&\s]{32,}/g, '[REDACTED_LONG_VALUE]')
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
const DEBUG: boolean = process.env.DEBUG === 'true';

// Load secrets from external environment variables only
const loadSecrets = (): void => {
  if (secretLoaded) return;

  if (DEBUG) logger.info('Starting loadSecrets process...');

  const externalKey: string | undefined = process.env.TRADING_SIM_API_KEY;
  if (!externalKey) {
    throw new Error('TRADING_SIM_API_KEY is required in environment variables.');
  }

  secretBuffer = sodium.sodium_malloc(externalKey.length) as sodium.SecureBuffer;
  secretBuffer.write(externalKey);
  sodium.sodium_mlock(secretBuffer);
  process.env.TRADING_SIM_API_KEY = '[REDACTED]';
  logger.info('Using TRADING_SIM_API_KEY from external environment variables.');
  secretLoaded = true;
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
    throw new Error('Missing required TRADING_SIM_API_KEY. Provide it via environment variables.');
  }
  const recommendedVars: (keyof Config)[] = ['TRADING_SIM_API_URL', 'DEBUG'];
  const missing: string[] = recommendedVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    logger.warn(`Missing recommended variables: ${missing.join(', ')}. Using defaults.`);
  }
}

// Cleanup API key securely when shutting down
export function cleanupApiKey(): void {
  if (secretBuffer) {
    try {
      sodium.sodium_memzero(secretBuffer);
      sodium.sodium_munlock(secretBuffer);
      secretBuffer = null;
      secretLoaded = false;
      logger.info('API key cleared securely');
    } catch (error) {
      logger.error(`Error clearing API key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Auto-cleanup on process exit (optional, gated by DEBUG)
if (DEBUG) {
  process.on('exit', () => {
    cleanupApiKey();
    logger.info('Process exit detected, cleaned up API key.');
  });
}

// Debug startup message
if (config.DEBUG) {
  logger.info('Starting environment setup...');
}