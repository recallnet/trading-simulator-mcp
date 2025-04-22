import * as fs from 'fs';
import { expect } from 'chai';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from 'path';

// Only run these tests if .env file exists (contains necessary credentials)
const dotenvExists = fs.existsSync('.env');
const conditionalDescribe = dotenvExists ? describe : describe.skip;

conditionalDescribe('MCP Integration Tests', function() {
  // Use long timeout for integration tests
  this.timeout(15000);

  // Use the real MCP client and transport
  let client: Client;
  let transport: StdioClientTransport;

  before(async () => {
    // Use real StdioClientTransport - no mocks
    transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
    });

    client = new Client(
      {
        name: 'test-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    try {
      await client.connect(transport);
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  });

  after(async () => {
    if (client) {
      await client.close();
    }
  });

  it('should list available tools', async () => {
    const { tools } = await client.listTools();
    expect(tools).to.be.an('array').that.is.not.empty;

    // Verify expected tool names are present
    const toolNames = tools.map(t => t.name);
    expect(toolNames).to.include('get_balances');
    expect(toolNames).to.include('get_portfolio');
    expect(toolNames).to.include('get_price');
  });

  it('should call get_balances tool', async () => {
    const result = await client.callTool({
      name: 'get_balances',
      arguments: {}
    });

    expect(result).to.have.property('isError');
    // Will be isError: true because of missing API key
    expect(result.content).to.be.an('array');
  });

  it('should call get_portfolio tool', async () => {
    const result = await client.callTool({
      name: 'get_portfolio',
      arguments: {}
    });

    expect(result).to.have.property('isError');
    // Will be isError: true because of missing API key
    expect(result.content).to.be.an('array'); // Or appropriate error shape
  });

  it('should call get_price tool', async () => {
    const result = await client.callTool({
      name: 'get_price',
      arguments: { tokenSymbol: 'SOL', vsTokenSymbol: 'USDC' } // Example args
    });

    expect(result).to.have.property('isError');
    // Will be isError: true because of missing API key
    expect(result.content).to.be.an('array');
  });

  it('should return empty list for resources', async () => {
    const result = await client.listResources();
    expect(result).to.have.property('resources');
    expect(result.resources).to.be.an('array').that.is.empty;
  });

  it('should return empty list for prompts', async () => {
    const result = await client.listPrompts();
    expect(result).to.have.property('prompts');
    expect(result.prompts).to.be.an('array').that.is.empty;
  });

  it('should call get_trades tool', async () => {
    const result = await client.callTool({
      name: 'get_trades',
      arguments: { limit: 10 }
    });

    expect(result).to.have.property('isError');
    expect(result.content).to.be.an('array');
  });

  it('should call get_token_info tool', async () => {
    const result = await client.callTool({
      name: 'get_token_info',
      arguments: { token: '0x1234567890123456789012345678901234567890' }
    });

    expect(result).to.have.property('isError');
    expect(result.content).to.be.an('array');
  });

  it('should call get_price_history tool', async () => {
    const result = await client.callTool({
      name: 'get_price_history',
      arguments: {
        token: '0x1234567890123456789012345678901234567890',
        interval: '1h'
      }
    });

    expect(result).to.have.property('isError');
    expect(result.content).to.be.an('array');
  });

  it('should call execute_trade tool', async () => {
    const result = await client.callTool({
      name: 'execute_trade',
      arguments: {
        fromToken: '0x1234567890123456789012345678901234567890',
        toToken: '0x0987654321098765432109876543210987654321',
        amount: '1.0'
      }
    });

    expect(result).to.have.property('isError');
    expect(result.content).to.be.an('array');
  });

  it('should call get_quote tool', async () => {
    const result = await client.callTool({
      name: 'get_quote',
      arguments: {
        fromToken: '0x1234567890123456789012345678901234567890',
        toToken: '0x0987654321098765432109876543210987654321',
        amount: '1.0'
      }
    });

    expect(result).to.have.property('isError');
    expect(result.content).to.be.an('array');
  });

  it('should call get_competition_status tool', async () => {
    const result = await client.callTool({
      name: 'get_competition_status',
      arguments: {}
    });

    expect(result).to.have.property('isError');
    expect(result.content).to.be.an('array');
  });

  it('should call get_leaderboard tool', async () => {
    const result = await client.callTool({
      name: 'get_leaderboard',
      arguments: {}
    });

    expect(result).to.have.property('isError');
    expect(result.content).to.be.an('array');
  });

  // Add tests for each tool only if .env exists
  // These will fail without valid API credentials as expected by our "no mocks" approach
});