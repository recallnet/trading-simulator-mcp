// Environment management for Trading Simulator MCP
import dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Only log a debug message if DEBUG is set
if (process.env.DEBUG === 'true') {
  console.error('Starting environment setup...');
}

// Check if the required environment variables are already set (from JSON config)
const hasRequiredEnvVars = !!process.env.TRADING_SIM_API_KEY;

// Only attempt to load .env file if required variables are not already set
if (!hasRequiredEnvVars) {
  // Try to find and load the .env file from various possible locations
  const envPaths = [
    resolve(process.cwd(), '.env'),
    // Add more potential locations if necessary
    resolve(process.cwd(), '../.env'),
  ];

  let loaded = false;
  for (const path of envPaths) {
    if (existsSync(path)) {
      dotenv.config({ path });
      loaded = true;
      if (process.env.DEBUG === 'true') {
        console.error(`Loaded environment from .env file at: ${path}`);
      }
      break;
    }
  }

  if (!loaded && process.env.DEBUG === 'true') {
    console.error('No .env file found. Using environment variables directly.');
  }
} else if (process.env.DEBUG === 'true') {
  console.error('Using environment variables from MCP configuration.');
}

// Validate required environment variables
const requiredEnvVars = ['TRADING_SIM_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

// Report missing environment variables
if (missingEnvVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please set these variables in your .env file or in your MCP configuration');
  process.exit(1);
}

// Sanitize sensitive environment variables for logging and display
export function sanitizeSecrets(obj: Record<string, any>) {
  const result = { ...obj };
  
  // Keys that should be considered sensitive and redacted
  const sensitiveKeys = [
    'api_key', 'apikey', 'secret', 'password', 'pass', 'key',
    'token', 'auth', 'credential', 'sign', 'encrypt'
  ];
  
  for (const key in result) {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a sensitive key
    if (sensitiveKeys.some(sk => lowerKey.includes(sk)) && typeof result[key] === 'string') {
      const value = result[key] as string;
      if (value.length > 8) {
        // Show only the first 3 and last 3 characters if long enough
        result[key] = `${value.substring(0, 3)}...${value.substring(value.length - 3)}`;
      } else {
        // For shorter values, just show ****
        result[key] = '********';
      }
    }
  }
  
  return result;
}

// Environment validation and configuration
export const ENV = {
  API_KEY: process.env.TRADING_SIM_API_KEY!,
  API_URL: process.env.TRADING_SIM_API_URL || 'http://localhost:3000',
  DEBUG: process.env.DEBUG === 'true',
};

// Ensure URL doesn't have trailing slash
if (ENV.API_URL.endsWith('/')) {
  ENV.API_URL = ENV.API_URL.slice(0, -1);
}

// Debug information with sanitized secrets
if (ENV.DEBUG) {
  console.error('Environment loaded with the following settings:');
  console.error(`API URL: ${ENV.API_URL}`);
  
  // Only show parts of sensitive values
  const sanitizedEnv = sanitizeSecrets({
    API_KEY: ENV.API_KEY
  });
  
  console.error(`API Key: ${sanitizedEnv.API_KEY}`);
}

// Set up security for console output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Function to redact sensitive information in console output
const redactSensitiveInfo = (args: any[]) => {
  return args.map(arg => {
    if (typeof arg === 'string') {
      // Redact API keys from strings
      return arg
        .replace(/(TRADING_SIM_API_KEY|api_key)=([^&\s]+)/gi, '$1=[REDACTED]');
    } else if (arg && typeof arg === 'object') {
      try {
        return sanitizeSecrets(arg);
      } catch (e) {
        return arg;
      }
    }
    return arg;
  });
};

// Override console methods to redact sensitive information
console.error = (...args: any[]) => {
  originalConsoleError(...redactSensitiveInfo(args));
};

console.warn = (...args: any[]) => {
  originalConsoleWarn(...redactSensitiveInfo(args));
};

// Export a safe version of the environment without sensitive data
export const SAFE_ENV = {
  API_URL: ENV.API_URL,
  DEBUG: ENV.DEBUG,
}; 