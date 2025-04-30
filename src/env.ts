import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// First try to load environment variables from .env file
const envPath = resolve(process.cwd(), '.env');
let envLoaded = false;

if (fs.existsSync(envPath)) {
  try {
    const result = dotenv.config({ path: envPath });
    envLoaded = !result.error;
    if (envLoaded) {
      console.log(`Environment variables loaded from ${envPath}`);
    } else {
      console.error(`Error loading environment from ${envPath}:`, result.error);
    }
  } catch (error) {
    console.error('Error loading .env file:', error);
  }
}

// Define types for configuration variables
interface Config {
  TRADING_SIM_API_URL: string;
  TRADING_SIM_API_KEY: string | undefined;
  DEBUG: boolean;
}

// Define logger interface
interface Logger {
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

// Custom logger implementation
export const logger: Logger = {
  error: (...args: any[]) => process.stderr.write(`${chalk.red('[ERROR]')} ${args.join(' ')}\n`),
  warn: (...args: any[]) => process.stderr.write(`${chalk.yellow('[WARN]')} ${args.join(' ')}\n`),
  info: (...args: any[]) => process.stderr.write(`${chalk.blue('[INFO]')} ${args.join(' ')}\n`),
};

// Export configuration object
export const config: Config = {
  TRADING_SIM_API_URL: process.env.TRADING_SIM_API_URL || 'http://localhost:3000',
  TRADING_SIM_API_KEY: process.env.TRADING_SIM_API_KEY || undefined,
  DEBUG: process.env.DEBUG === 'true',
};

// Ensure URL doesn't have trailing slash
if (config.TRADING_SIM_API_URL.endsWith('/')) {
  config.TRADING_SIM_API_URL = config.TRADING_SIM_API_URL.slice(0, -1);
}

// Validate environment
export function validateEnv(): void {
  const source = envLoaded ? '.env file' : 'environment variables';
  const recommendedVars: (keyof Config)[] = ['TRADING_SIM_API_URL', 'DEBUG'];
  const missing: string[] = recommendedVars.filter((v) => !process.env[v]);
  
  if (missing.length > 0) {
    logger.warn(`Missing recommended variables from ${source}: ${missing.join(', ')}. Using defaults.`);
  }
  
  if (!config.TRADING_SIM_API_KEY) {
    logger.error(`Missing required API key (TRADING_SIM_API_KEY) in ${source}. Please provide an API key to use the trading simulator.`);
    return;
  }
}

// Debug startup message
if (config.DEBUG) {
  logger.info('Starting environment setup...');
  logger.info(`API URL: ${config.TRADING_SIM_API_URL}`);
  if (config.TRADING_SIM_API_KEY) {
    // Only show last 4 chars of the API key for security
    const maskedKey = '****' + config.TRADING_SIM_API_KEY.slice(-4);
    logger.info(`API Key: ${maskedKey}`);
  } else {
    logger.info('API Key: Not set');
  }
  logger.info(`Environment source: ${envLoaded ? '.env file' : 'environment variables'}`);
}