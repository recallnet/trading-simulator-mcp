import { config, logger } from './env.js';
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
 * Handles authentication and provides methods for interacting
 * with the Trading Simulator API.
 */
export class TradingSimulatorClient {
  private apiKey: string;
  private baseUrl: string;
  private debug: boolean;

  /**
   * Create a new instance of the Trading Simulator client
   * 
   * @param apiKey The API key for your team
   * @param baseUrl The base URL of the Trading Simulator API
   * @param debug Whether to enable debug logging
   */
  constructor(
    apiKey?: string | undefined,
    baseUrl: string = config.TRADING_SIM_API_URL,
    debug: boolean = config.DEBUG
  ) {
    // Trim the API key to avoid whitespace issues (if provided)
    const providedKey = apiKey || config.TRADING_SIM_API_KEY;
    this.apiKey = providedKey ? providedKey.trim() : '';
    
    // Check for empty API key but don't throw - this allows client creation
    // but will fail on actual API calls
    if (!this.apiKey) {
      logger.error('No API key provided. API calls will fail until a key is set.');
    }

    // Normalize the base URL to ensure no trailing slash
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.debug = debug;
  }

  /**
   * Generate the required headers for API authentication
   * 
   * @returns An object containing the required headers
   */
  private generateHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'TradingSimMCP/1.0'
    };

    if (this.debug) {
      logger.info('[ApiClient] Request headers:');
      logger.info('[ApiClient] Authorization: Bearer xxxxx... (masked)');
      logger.info('[ApiClient] Content-Type:', headers['Content-Type']);
    }

    return headers;
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
    const url = `${this.baseUrl}${path}`;
    const bodyString = body ? JSON.stringify(body) : undefined;
    const headers = this.generateHeaders();
  
    const options: RequestInit = {
      method: method.toUpperCase(),
      headers,
      body: bodyString,
    };
  
    if (this.debug) {
      logger.info('[ApiClient] Request details:');
      logger.info('[ApiClient] Method:', method);
      logger.info('[ApiClient] URL:', url);
      logger.info('[ApiClient] Body:', body ? JSON.stringify(body, null, 2) : 'none');
    }
  
    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (networkError) {
      logger.error('[ApiClient] Network error during fetch:', networkError);
      throw new Error('Network error occurred while making API request.');
    }
  
    const responseText = await response.text();
  
    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      if (responseText.trim()) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {
          errorMessage = responseText;
        }
      }
      throw new Error(errorMessage);
    }
  
    try {
      const data = JSON.parse(responseText);
      return data as T;
    } catch (parseError) {
      throw new Error(`Failed to parse successful response: ${parseError}`);
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
    if (params.slippageTolerance) payload.slippageTolerance = params.slippageTolerance;
    if (params.fromChain) payload.fromChain = params.fromChain;
    if (params.toChain) payload.toChain = params.toChain;
    if (params.fromSpecificChain) payload.fromSpecificChain = params.fromSpecificChain;
    if (params.toSpecificChain) payload.toSpecificChain = params.toSpecificChain;

    // If chain parameters are not provided, try to detect them
    if (!params.fromChain) {
      payload.fromChain = this.detectChain(params.fromToken);
    }

    if (!params.toChain) {
      payload.toChain = this.detectChain(params.toToken);
    }

    // Make the API request
    return this.request<TradeExecutionResponse>('POST', '/api/trade/execute', payload);
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
    let query = `?fromToken=${encodeURIComponent(fromToken)}&toToken=${encodeURIComponent(toToken)}&amount=${encodeURIComponent(amount)}`;

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
   * @param competitionId Optional ID of a specific competition (uses active competition by default)
   * @returns A promise that resolves to the leaderboard response
   */
  async getLeaderboard(competitionId?: string): Promise<LeaderboardResponse> {
    const path = competitionId
      ? `/api/competition/leaderboard?competitionId=${competitionId}`
      : '/api/competition/leaderboard';

    return this.request<LeaderboardResponse>('GET', path);
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