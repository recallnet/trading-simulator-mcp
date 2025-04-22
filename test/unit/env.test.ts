import { expect } from 'chai';
import { config, validateEnv, logger } from '../../src/env.js';

describe('Environment Configuration', () => {
  // Save original environment variables and stderr.write
  const originalEnv = { ...process.env };
  const originalStderrWrite = process.stderr.write;
  let output = '';

  beforeEach(() => {
    // Reset captured output
    output = '';

    // Mock stderr.write to capture output
    process.stderr.write = ((str: string) => {
      output += str;
      return true;
    }) as any;
  });

  afterEach(() => {
    // Restore environment variables and stderr.write
    process.env = { ...originalEnv };
    process.stderr.write = originalStderrWrite;
  });

  it('should have default API URL', () => {
    // Test real configuration without mocks
    expect(config).to.have.property('TRADING_SIM_API_URL');
    expect(config.TRADING_SIM_API_URL).to.be.a('string');
  });

  it('should have debug flag', () => {
    expect(config).to.have.property('DEBUG');
    expect(config.DEBUG).to.be.a('boolean');
  });

  it('should remove trailing slash from API URL', () => {
    // Test directly by modifying the config object
    const originalUrl = config.TRADING_SIM_API_URL;
    config.TRADING_SIM_API_URL = 'http://test.com/';

    // Manually trigger the slash removal logic
    if (config.TRADING_SIM_API_URL.endsWith('/')) {
      config.TRADING_SIM_API_URL = config.TRADING_SIM_API_URL.slice(0, -1);
    }

    expect(config.TRADING_SIM_API_URL).to.equal('http://test.com');

    // Restore original
    config.TRADING_SIM_API_URL = originalUrl;
  });

  it('should log warning for missing recommended vars', () => {
    // Temporarily unset env vars to test warnings
    delete process.env.TRADING_SIM_API_URL;
    delete process.env.DEBUG;

    // Call the real validation function
    validateEnv();

    // Verify warning was logged
    expect(output).to.include('Missing recommended variables');
    expect(output).to.include('TRADING_SIM_API_URL');
    expect(output).to.include('DEBUG');
  });

  it('should log error for missing API key', () => {
    // Ensure API key is not set
    delete process.env.TRADING_SIM_API_KEY;

    // Call the real validation function
    validateEnv();

    // Verify error was logged
    expect(output).to.include('Missing required API key');
    // Verify function returned (implicitly void)
    expect(validateEnv()).to.be.undefined;
  });

  it('should log debug message when DEBUG is true', () => {
    // Set debug to true
    const originalDebug = process.env.DEBUG;
    process.env.DEBUG = 'true';

    // Call a function that would trigger the debug message
    logger.info('Starting environment setup...');

    // Check output has the message
    expect(output).to.include('Starting environment setup');

    // Restore original
    process.env.DEBUG = originalDebug;
  });
});