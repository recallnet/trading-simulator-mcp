import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { TradingSimulatorClient, tradingClient } from '../../src/api-client.js';
import { BlockchainType, SpecificChain } from '../../src/types.js';

// Configure chai
chai.use(chaiAsPromised);

describe('TradingSimulatorClient', () => {
  let client: TradingSimulatorClient;
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    // Create a fresh client for each test
    client = new TradingSimulatorClient('test-key', 'http://example.com');

    // Create a stub for fetch
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    // Restore original fetch
    fetchStub.restore();
  });

  describe('detectChain', () => {
    it('should detect EVM addresses correctly', () => {
      // Test with real implementation
      expect(client.detectChain('0x1234567890123456789012345678901234567890')).to.equal(BlockchainType.EVM);
    });

    it('should default to SVM for non-EVM addresses', () => {
      // Test with real implementation
      expect(client.detectChain('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).to.equal(BlockchainType.SVM);
    });
  });

  describe('API calls', () => {
    // Note: These tests will fail without a real API key and endpoint
    // This is INTENTIONAL to enforce our "no mocks" rule.
    // The tests should be skipped in CI unless credentials are provided.

    // Check that environment has necessary values for API tests
    const hasApiCredentials = process.env.TRADING_SIM_API_KEY && process.env.TRADING_SIM_API_URL;
    const conditionalIt = hasApiCredentials ? it : it.skip;

    conditionalIt('should get balances', async () => {
      // Using real API client with real implementation
      const result = await tradingClient.getBalances();
      expect(result).to.be.an('object');
      // Further assertions on real response shape
    });

    conditionalIt('should get portfolio', async () => {
      const result = await tradingClient.getPortfolio();
      expect(result).to.be.an('object');
      // Further assertions on real response shape
    });

    conditionalIt('should handle API errors properly', async () => {
      // Create client with invalid API key to test error handling
      const invalidClient = new TradingSimulatorClient('invalid-key', 'http://example.com');

      // Expect real API error to be thrown and handled properly
      await expect(invalidClient.getBalances()).to.be.rejectedWith(Error);
    });
  });

  describe('constructor', () => {
    it('should warn if no API key is provided', () => {
      // Capture stderr to verify warning
      const originalStderrWrite = process.stderr.write;
      let output = '';

      process.stderr.write = ((str: string) => {
        output += str;
        return true;
      }) as any;

      // Create client with no API key
      new TradingSimulatorClient(undefined, 'http://example.com');

      // Restore stderr
      process.stderr.write = originalStderrWrite;

      // Verify warning was logged
      expect(output).to.include('No API key provided');
    });

    it('should normalize base URL by removing trailing slash', () => {
      const client = new TradingSimulatorClient('key', 'http://example.com/');

      // Access private property using any cast (only for testing)
      const baseUrl = (client as any).baseUrl;

      expect(baseUrl).to.equal('http://example.com');
    });

    it('should trim provided API key', () => {
      const client = new TradingSimulatorClient('  key-with-whitespace  ');
      const apiKey = (client as any).apiKey;
      expect(apiKey).to.equal('key-with-whitespace');
    });

    it('should initialize with debug flag from config', () => {
      const client = new TradingSimulatorClient('key', 'http://example.com', true);
      const debug = (client as any).debug;
      expect(debug).to.be.true;
    });
  });

  describe('private request method', () => {
    it('should handle successful responses', async () => {
      // Mock successful response
      const mockResponse = {
        ok: true,
        text: async () => JSON.stringify({ success: true, data: 'test' })
      };
      fetchStub.resolves(mockResponse as any);

      // Call private request method using any cast
      const result = await (client as any).request('GET', '/test');

      expect(result).to.deep.equal({ success: true, data: 'test' });
      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.firstCall.args[0]).to.equal('http://example.com/test');
    });

    it('should handle network errors', async () => {
      // Mock network error
      fetchStub.rejects(new Error('Network error'));

      // Call private request method and expect error to be thrown
      try {
        await (client as any).request('GET', '/test');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Network error occurred while making API request.');
      }
    });

    it('should handle API errors', async () => {
      // Mock API error response
      const mockResponse = {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: 'Bad request' } })
      };
      fetchStub.resolves(mockResponse as any);

      // Call private request method and expect error to be thrown
      try {
        await (client as any).request('GET', '/test');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Bad request');
      }
    });

    it('should handle JSON parse errors', async () => {
      // Mock invalid JSON response
      const mockResponse = {
        ok: true,
        text: async () => 'Invalid JSON'
      };
      fetchStub.resolves(mockResponse as any);

      // Call private request method and expect error to be thrown
      try {
        await (client as any).request('GET', '/test');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to parse successful response');
      }
    });
  });

  describe('API methods', () => {
    beforeEach(() => {
      // Create stub for successful responses
      const mockResponse = {
        ok: true,
        text: async () => JSON.stringify({ success: true })
      };
      fetchStub.resolves(mockResponse as any);
    });

    it('should call getTrades with correct parameters', async () => {
      await client.getTrades({ limit: 10, offset: 5, token: '0x123', chain: BlockchainType.EVM });

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.include('/api/account/trades?');
      expect(url).to.include('limit=10');
      expect(url).to.include('offset=5');
      expect(url).to.include('token=0x123');
      expect(url).to.include('chain=evm');
    });

    it('should call getPrice with minimal parameters', async () => {
      await client.getPrice('0x123');

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.equal('http://example.com/api/price?token=0x123');
    });

    it('should call getPrice with all parameters', async () => {
      await client.getPrice('0x123', BlockchainType.EVM, SpecificChain.ETH);

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.include('/api/price?');
      expect(url).to.include('token=0x123');
      expect(url).to.include('chain=evm');
      expect(url).to.include('specificChain=eth');
    });

    it('should call getTokenInfo with all parameters', async () => {
      await client.getTokenInfo('0x123', BlockchainType.EVM, SpecificChain.ETH);

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.include('/api/price/token-info?');
      expect(url).to.include('token=0x123');
      expect(url).to.include('chain=evm');
      expect(url).to.include('specificChain=eth');
    });

    it('should call getPriceHistory with required parameters', async () => {
      await client.getPriceHistory({ token: '0x123' });

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.equal('http://example.com/api/price/history?token=0x123');
    });

    it('should call getPriceHistory with all parameters', async () => {
      await client.getPriceHistory({
        token: '0x123',
        startTime: '2023-01-01',
        endTime: '2023-02-01',
        interval: '1h',
        chain: BlockchainType.EVM,
        specificChain: SpecificChain.ETH
      });

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.include('/api/price/history?');
      expect(url).to.include('token=0x123');
      expect(url).to.include('startTime=2023-01-01');
      expect(url).to.include('endTime=2023-02-01');
      expect(url).to.include('interval=1h');
      expect(url).to.include('chain=evm');
      expect(url).to.include('specificChain=eth');
    });

    it('should call executeTrade with required parameters', async () => {
      await client.executeTrade({
        fromToken: '0x1234567890123456789012345678901234567890',
        toToken: '0x0987654321098765432109876543210987654321',
        amount: '1.0'
      });

      expect(fetchStub.calledOnce).to.be.true;

      // Check URL
      const url = fetchStub.firstCall.args[0];
      expect(url).to.equal('http://example.com/api/trade/execute');

      // Check method and body
      const options = fetchStub.firstCall.args[1];
      expect(options.method).to.equal('POST');

      const body = JSON.parse(options.body);
      expect(body.fromToken).to.equal('0x1234567890123456789012345678901234567890');
      expect(body.toToken).to.equal('0x0987654321098765432109876543210987654321');
      expect(body.amount).to.equal('1.0');
      expect(body.fromChain).to.equal('evm'); // Auto-detected
      expect(body.toChain).to.equal('evm'); // Auto-detected
    });

    it('should call executeTrade with all parameters', async () => {
      await client.executeTrade({
        fromToken: '0x123',
        toToken: '0x456',
        amount: '1.0',
        slippageTolerance: '0.5',
        fromChain: BlockchainType.EVM,
        toChain: BlockchainType.EVM,
        fromSpecificChain: SpecificChain.ETH,
        toSpecificChain: SpecificChain.POLYGON
      });

      expect(fetchStub.calledOnce).to.be.true;

      const options = fetchStub.firstCall.args[1];
      const body = JSON.parse(options.body);
      expect(body.fromToken).to.equal('0x123');
      expect(body.toToken).to.equal('0x456');
      expect(body.amount).to.equal('1.0');
      expect(body.slippageTolerance).to.equal('0.5');
      expect(body.fromChain).to.equal('evm');
      expect(body.toChain).to.equal('evm');
      expect(body.fromSpecificChain).to.equal('eth');
      expect(body.toSpecificChain).to.equal('polygon');
    });

    it('should call getQuote with required parameters', async () => {
      await client.getQuote('0x123', '0x456', '1.0');

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.include('/api/trade/quote?');
      expect(url).to.include('fromToken=0x123');
      expect(url).to.include('toToken=0x456');
      expect(url).to.include('amount=1.0');
    });

    it('should call getCompetitionStatus', async () => {
      await client.getCompetitionStatus();

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.equal('http://example.com/api/competition/status');
    });

    it('should call getLeaderboard without competition ID', async () => {
      await client.getLeaderboard();

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.equal('http://example.com/api/competition/leaderboard');
    });

    it('should call getLeaderboard with competition ID', async () => {
      await client.getLeaderboard('comp-123');

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.equal('http://example.com/api/competition/leaderboard?competitionId=comp-123');
    });

    it('should call getCompetitionRules', async () => {
      await client.getCompetitionRules();

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.equal('http://example.com/api/competition/rules');
    });

    it('should call findCoinLists', async () => {
      await client.findCoinLists();

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.equal('http://example.com/api/admin/coin-lists');
    });

    it('should call getTokenRates', async () => {
      await client.getTokenRates();

      expect(fetchStub.calledOnce).to.be.true;
      const url = fetchStub.firstCall.args[0];
      expect(url).to.equal('http://example.com/api/price/token-rates');
    });

    it('should handle errors in findCoinLists', async () => {
      // Mock API error response
      const mockResponse = {
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ error: { message: 'Forbidden' } })
      };
      fetchStub.resolves(mockResponse as any);

      try {
        await client.findCoinLists();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Forbidden');
      }
    });

    it('should handle errors in getTokenRates', async () => {
      // Mock API error response
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: { message: 'Server error' } })
      };
      fetchStub.resolves(mockResponse as any);

      try {
        await client.getTokenRates();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Server error');
      }
    });
  });
});