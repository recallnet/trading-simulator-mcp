import * as crypto from 'crypto';
import { ENV } from './env.js';
import {
  BlockchainType,
  SpecificChain,
  TradeParams,
  TradeHistoryParams,
  PriceHistoryParams,
  BalancesResponse,
  PortfolioResponse,
  TradesResponse,
  PriceResponse,
  TokenInfoResponse,
  PriceHistoryResponse,
  TradeExecutionResponse,
  QuoteResponse,
  CompetitionStatusResponse,
  LeaderboardResponse,
  CompetitionRulesResponse,
  COMMON_TOKENS
} from './types.js';

/**
 * Trading Simulator API Client
 * 
 * Handles authentication, request signing, and provides methods for interacting
 * with the Trading Simulator API.
 */
export class TradingSimulatorClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private testMode: boolean;

  /**
   * Create a new instance of the Trading Simulator client
   * 
   * @param apiKey The API key for your team
   * @param apiSecret The API secret for your team
   * @param baseUrl The base URL of the Trading Simulator API
   * @param testMode Whether to use a future timestamp for testing (default: false for production usage)
   */
  constructor(
    apiKey: string = ENV.API_KEY,
    apiSecret: string = ENV.API_SECRET,
    baseUrl: string = ENV.API_URL,
    testMode: boolean = false // Default to false for regular production/developer usage
  ) {
    // Trim the API key and secret to avoid whitespace issues
    this.apiKey = (apiKey || '').trim();
    this.apiSecret = (apiSecret || '').trim();
    
    // Normalize the base URL to ensure no trailing slash
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.testMode = testMode;
  }

  /**
   * Generate the required headers for API authentication
   * 
   * @param method The HTTP method (GET, POST, etc.)
   * @param path The API endpoint path (e.g., /api/account/balances)
   * @param body The request body (if any)
   * @returns An object containing the required headers
   */
  private generateHeaders(method: string, path: string, body: string = '{}'): Record<string, string> {
    // Normalize method to uppercase
    const normalizedMethod = method.toUpperCase();
    
    // Don't modify the path - use it exactly as provided
    // This ensures the path used for signatures matches the actual request path
    const normalizedPath = path;
    
    // Use current timestamp for production or future timestamp for testing
    let timestamp: string;
    if (this.testMode) {
      // Use timestamp 2 years in the future for tests (to avoid expiration)
      timestamp = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Use current timestamp for production use
      timestamp = new Date().toISOString();
    }
    
    // Important: Use '{}' for empty bodies to match the server's implementation
    const bodyString = body || '{}';
    
    // Remove query parameters for signature generation to match server behavior
    const pathForSignature = normalizedPath.split('?')[0];
    const data = normalizedMethod + pathForSignature + timestamp + bodyString;
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(data)
      .digest('hex');
  
    return {
      'X-API-Key': this.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
      'User-Agent': 'TradingSimMCP/1.0'
    };
  }

  /**
   * Make a request to the API
   * 
   * @param method The HTTP method
   * @param path The API endpoint path
   * @param body The request body (if any)
   * @returns A promise that resolves to the API response
   */
  private async request<T>(method: string, path: string, body: any = null): Promise<T> {
    // Don't modify the path - use it exactly as provided
    // This ensures the path used for signatures matches the actual request path
    const url = `${this.baseUrl}${path}`;
    
    // Handle body consistently - stringify once and only once
    let bodyString = '{}';
    if (body !== null) {
      bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    }
    
    // Generate headers with the properly formatted body string
    const headers = this.generateHeaders(method, path, bodyString);
    
    const options: RequestInit = {
      method: method.toUpperCase(),
      headers,
      body: body !== null ? bodyString : undefined
    };

    try {
      const response = await fetch(url, options);
      let data: any;
      
      try {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`Failed to parse response: ${parseError}`);
        }
      } catch (parseError) {
        throw new Error(`Failed to read response: ${parseError}`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `API request failed with status ${response.status}`);
      }
      
      return data as T;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Detect blockchain type from token address format
   * 
   * @param token The token address
   * @returns The detected blockchain type (SVM or EVM)
   */
  public detectChain(token: string): BlockchainType {
    // Ethereum addresses start with '0x' followed by 40 hex characters
    if (/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return BlockchainType.EVM;
    }
    // Solana addresses are base58 encoded, typically around 44 characters
    return BlockchainType.SVM;
  }

  /**
   * Get your team's token balances across all supported chains
   * 
   * @returns Balance information including tokens on all chains (EVM and SVM)
   */
  async getBalances(): Promise<BalancesResponse> {
    return this.request<BalancesResponse>('GET', '/api/account/balances');
  }

  /**
   * Get your team's portfolio information
   * 
   * @returns Portfolio information including positions and total value
   */
  async getPortfolio(): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>('GET', '/api/account/portfolio');
  }

  /**
   * Get the trade history for your team
   * 
   * @param options Optional filtering parameters
   * @returns A promise that resolves to the trade history response
   */
  async getTrades(options?: TradeHistoryParams): Promise<TradesResponse> {
    let query = '';
    
    if (options) {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.token) params.append('token', options.token);
      if (options.chain) params.append('chain', options.chain);
      query = `?${params.toString()}`;
    }
    
    return this.request<TradesResponse>('GET', `/api/account/trades${query}`);
  }

  /**
   * Get the current price for a token
   * 
   * @param token The token address to get the price for
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @param specificChain Optional specific chain for EVM tokens (like eth, polygon, base, etc.)
   * @returns A promise that resolves to the price response
   */
  async getPrice(
    token: string, 
    chain?: BlockchainType,
    specificChain?: SpecificChain
  ): Promise<PriceResponse> {
    let query = `?token=${encodeURIComponent(token)}`;
    
    // Add chain parameter if explicitly provided
    if (chain) {
      query += `&chain=${chain}`;
    }
    
    // Add specificChain parameter if provided (for EVM tokens)
    if (specificChain) {
      query += `&specificChain=${specificChain}`;
    }
    
    return this.request<PriceResponse>('GET', `/api/price${query}`);
  }

  /**
   * Get detailed token information including specific chain
   * 
   * @param token The token address
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @param specificChain Optional specific chain for EVM tokens
   * @returns A promise that resolves to the token info response
   */
  async getTokenInfo(
    token: string,
    chain?: BlockchainType,
    specificChain?: SpecificChain
  ): Promise<TokenInfoResponse> {
    let query = `?token=${encodeURIComponent(token)}`;
    
    // Add chain parameter if explicitly provided
    if (chain) {
      query += `&chain=${chain}`;
    }
    
    // Add specificChain parameter if provided
    if (specificChain) {
      query += `&specificChain=${specificChain}`;
    }
    
    return this.request<TokenInfoResponse>('GET', `/api/price/token-info${query}`);
  }

  /**
   * Get historical price data for a token
   * 
   * @param params Parameters for the price history request
   * @returns A promise that resolves to the price history response
   */
  async getPriceHistory(params: PriceHistoryParams): Promise<PriceHistoryResponse> {
    const urlParams = new URLSearchParams();
    urlParams.append('token', params.token);
    
    if (params.startTime) urlParams.append('startTime', params.startTime);
    if (params.endTime) urlParams.append('endTime', params.endTime);
    if (params.interval) urlParams.append('interval', params.interval);
    if (params.chain) urlParams.append('chain', params.chain);
    if (params.specificChain) urlParams.append('specificChain', params.specificChain);
    
    const query = `?${urlParams.toString()}`;
    return this.request<PriceHistoryResponse>('GET', `/api/price/history${query}`);
  }

  /**
   * Find token in COMMON_TOKENS and determine its chain information
   * 
   * @param token The token address to find
   * @returns An object with chain and specificChain if found, null otherwise
   */
  private findTokenChainInfo(token: string): { chain: BlockchainType, specificChain: SpecificChain } | null {
    // Check SVM tokens
    if (COMMON_TOKENS.SVM) {
      for (const [specificChain, tokens] of Object.entries(COMMON_TOKENS.SVM)) {
        for (const [_, address] of Object.entries(tokens)) {
          if (address === token) {
            return {
              chain: BlockchainType.SVM,
              specificChain: SpecificChain.SVM
            };
          }
        }
      }
    }
    
    // Check EVM tokens
    if (COMMON_TOKENS.EVM) {
      for (const [specificChain, tokens] of Object.entries(COMMON_TOKENS.EVM)) {
        for (const [_, address] of Object.entries(tokens)) {
          if (address.toLowerCase() === token.toLowerCase()) {
            return {
              chain: BlockchainType.EVM,
              specificChain: specificChain as SpecificChain
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Execute a token trade on the trading simulator
   * 
   * @param params Trade parameters
   * @returns A promise that resolves to the trade execution response
   */
  async executeTrade(params: TradeParams): Promise<TradeExecutionResponse> {
    // Create the request payload
    const payload: any = {
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount
    };
    
    // Add optional parameters if they exist
    if (params.price) payload.price = params.price;
    if (params.slippageTolerance) payload.slippageTolerance = params.slippageTolerance;
    
    // Check if the tokens are in COMMON_TOKENS and get their chain info
    const fromTokenInfo = this.findTokenChainInfo(params.fromToken);
    const toTokenInfo = this.findTokenChainInfo(params.toToken);
    
    // Add explicitly provided chain parameters if they exist
    let hasExplicitFromChain = false;
    let hasExplicitToChain = false;
    
    if (params.fromChain) {
      payload.fromChain = params.fromChain;
      hasExplicitFromChain = true;
    }
    
    if (params.toChain) {
      payload.toChain = params.toChain;
      hasExplicitToChain = true;
    }
    
    if (params.fromSpecificChain) {
      payload.fromSpecificChain = params.fromSpecificChain;
      hasExplicitFromChain = true;
    }
    
    if (params.toSpecificChain) {
      payload.toSpecificChain = params.toSpecificChain;
      hasExplicitToChain = true;
    }
    
    // If no explicit chain parameters were provided, auto-detect or use COMMON_TOKENS info
    
    // First, try same-chain trade if both tokens are found and on the same chain
    if (fromTokenInfo && toTokenInfo && 
        fromTokenInfo.chain === toTokenInfo.chain && 
        fromTokenInfo.specificChain === toTokenInfo.specificChain) {
      
      if (!hasExplicitFromChain) {
        payload.fromChain = fromTokenInfo.chain;
        payload.fromSpecificChain = fromTokenInfo.specificChain;
      }
      
      if (!hasExplicitToChain) {
        payload.toChain = toTokenInfo.chain;
        payload.toSpecificChain = toTokenInfo.specificChain;
      }
    } 
    // For tokens where only one is known from COMMON_TOKENS
    else {
      // Auto-assign fromChain info if known and not explicitly provided
      if (fromTokenInfo && !hasExplicitFromChain) {
        payload.fromChain = fromTokenInfo.chain;
        payload.fromSpecificChain = fromTokenInfo.specificChain;
      }
      
      // Auto-assign toChain info if known and not explicitly provided
      if (toTokenInfo && !hasExplicitToChain) {
        payload.toChain = toTokenInfo.chain;
        payload.toSpecificChain = toTokenInfo.specificChain;
      }
      
      // For remaining unknown chains, use the autodetect
      if (!payload.fromChain) {
        payload.fromChain = this.detectChain(params.fromToken);
      }
      
      if (!payload.toChain) {
        payload.toChain = this.detectChain(params.toToken);
      }
    }
    
    try {
      // Make the first API request attempt
      return await this.request<TradeExecutionResponse>('POST', '/api/trade/execute', payload);
    } catch (error) {
      // If the first attempt fails and we auto-assigned parameters for cross-chain trade,
      // try again with auto-assigned parameters removed
      if (error instanceof Error && 
          error.message.includes('cross-chain') && 
          (fromTokenInfo || toTokenInfo)) {
        
        // Create a new payload without auto-assigned chain parameters
        const fallbackPayload: Record<string, any> = {
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: params.amount
        };
        
        // Only keep explicitly provided parameters
        if (params.price) fallbackPayload.price = params.price;
        if (params.slippageTolerance) fallbackPayload.slippageTolerance = params.slippageTolerance;
        if (params.fromChain) fallbackPayload.fromChain = params.fromChain;
        if (params.toChain) fallbackPayload.toChain = params.toChain;
        if (params.fromSpecificChain) fallbackPayload.fromSpecificChain = params.fromSpecificChain;
        if (params.toSpecificChain) fallbackPayload.toSpecificChain = params.toSpecificChain;
        
        // Try again with only explicit parameters
        return this.request<TradeExecutionResponse>('POST', '/api/trade/execute', fallbackPayload);
      }
      
      // Re-throw the error if it's not a cross-chain issue or we can't handle it
      throw error;
    }
  }

  /**
   * Get a quote for a potential trade
   * 
   * @param fromToken Source token address
   * @param toToken Destination token address
   * @param amount Amount of fromToken to trade
   * @returns A promise that resolves to the quote response
   */
  async getQuote(
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<QuoteResponse> {
    const query = `?fromToken=${encodeURIComponent(fromToken)}&toToken=${encodeURIComponent(toToken)}&amount=${encodeURIComponent(amount)}`;
    return this.request<QuoteResponse>('GET', `/api/trade/quote${query}`);
  }

  /**
   * Get the status of the current competition
   * 
   * @returns A promise that resolves to the competition status response
   */
  async getCompetitionStatus(): Promise<CompetitionStatusResponse> {
    return this.request<CompetitionStatusResponse>('GET', '/api/competition/status');
  }

  /**
   * Get the leaderboard for the current competition
   * 
   * @returns A promise that resolves to the leaderboard response
   */
  async getLeaderboard(): Promise<LeaderboardResponse> {
    return this.request<LeaderboardResponse>('GET', '/api/competition/leaderboard');
  }

  /**
   * Get the rules for the current competition
   * 
   * @returns A promise that resolves to the competition rules response
   */
  async getCompetitionRules(): Promise<CompetitionRulesResponse> {
    return this.request<CompetitionRulesResponse>('GET', '/api/competition/rules');
  }
}

// Create a singleton instance of the client
export const tradingClient = new TradingSimulatorClient(); 