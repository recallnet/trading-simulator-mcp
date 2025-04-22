/**
 * Environment Configuration Module
 *
 * This module handles environment variables, configuration settings, and logging
 * for the Trading Simulator MCP server.
 *
 * @module env
 */

import chalk from "chalk";

/**
 * Configuration interface for environment variables
 *
 * Defines the structure of configuration variables used throughout the application.
 */
interface Config {
  /** API URL for the Trading Simulator */
  TRADING_SIM_API_URL: string;
  /** API Key for authentication with the Trading Simulator */
  TRADING_SIM_API_KEY: string | undefined;
  /** Debug mode flag to enable additional logging */
  DEBUG: boolean;
}

/**
 * Logger interface for consistent logging
 *
 * Provides standardized logging methods with different severity levels.
 */
interface Logger {
  /** Log error messages */
  error: (...args: any[]) => void;
  /** Log warning messages */
  warn: (...args: any[]) => void;
  /** Log informational messages */
  info: (...args: any[]) => void;
}

/**
 * Custom logger implementation with colored output
 *
 * Uses chalk for colorized terminal output and writes to stderr to avoid
 * interfering with stdout which is used for MCP protocol messages.
 */
export const logger: Logger = {
  error: (...args: any[]) =>
    process.stderr.write(`${chalk.red("[ERROR]")} ${args.join(" ")}\n`),
  warn: (...args: any[]) =>
    process.stderr.write(`${chalk.yellow("[WARN]")} ${args.join(" ")}\n`),
  info: (...args: any[]) =>
    process.stderr.write(`${chalk.blue("[INFO]")} ${args.join(" ")}\n`),
};

/**
 * Configuration object with environment variables and defaults
 *
 * Loads configuration from environment variables with fallbacks to default values.
 */
export const config: Config = {
  TRADING_SIM_API_URL:
    process.env.TRADING_SIM_API_URL || "http://localhost:3000",
  TRADING_SIM_API_KEY: process.env.TRADING_SIM_API_KEY || undefined,
  DEBUG: process.env.DEBUG === "true",
};

// Ensure URL doesn't have trailing slash
if (config.TRADING_SIM_API_URL.endsWith("/")) {
  config.TRADING_SIM_API_URL = config.TRADING_SIM_API_URL.slice(0, -1);
}

/**
 * Validate the environment configuration
 *
 * Checks for required and recommended environment variables.
 * Logs warnings for missing recommended variables and errors for required ones.
 *
 * @returns {void}
 */
export function validateEnv(): void {
  const recommendedVars: (keyof Config)[] = ["TRADING_SIM_API_URL", "DEBUG"];
  const missing: string[] = recommendedVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    logger.warn(
      `Missing recommended variables: ${missing.join(", ")}. Using defaults.`,
    );
  }

  if (!config.TRADING_SIM_API_KEY) {
    logger.error(
      "Missing required API key (TRADING_SIM_API_KEY). Please provide an API key to use the trading simulator.",
    );
    return;
  }
}

// Debug startup message
if (config.DEBUG) {
  logger.info("Starting environment setup...");
}
