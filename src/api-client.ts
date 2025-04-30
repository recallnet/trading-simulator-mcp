import { config, logger } from './env.js';
import {
  BlockchainType,
  SpecificChain,
  TradeParams,
  TradeHistoryParams,
  PriceHistoryParams,
  BalancesResponse,
  PortfolioResponse,
  TradeHistoryResponse,
  PriceResponse,
  TokenInfoResponse,
  PriceHistoryResponse,
  TradeResponse,
  QuoteResponse,
  CompetitionStatusResponse,
  LeaderboardResponse,
  CompetitionRulesResponse,
  COMMON_TOKENS,
  TeamProfileResponse,
  HealthCheckResponse,
  DetailedHealthCheckResponse,
  TeamMetadata,
  ApiResponse,
  ErrorResponse,
} from './types.js';

/**
 * Trading Simulator API Client
 * 
 * Handles authentication and provides methods for interacting
 * with the Trading Simulator API.
 */
export class TradingSimulatorClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
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
   * Type guard to check if response is an ErrorResponse
   */
  private isErrorResponse(response: any): response is ErrorResponse {
    return (
      response !== null &&
      typeof response === 'object' &&
      response.success === false &&
      'error' in response &&
      'status' in response
    );
  }

  /**
   * Helper method to handle API errors consistently
   */
  private handleApiError(error: any, operation: string): ErrorResponse {
    logger.error(`Failed to ${operation}:`, error);

    // Handle fetch error responses
    if (error instanceof Error) {
      const status = 'status' in error ? (error as any).status : 500;
      
      return { 
        success: false, 
        error: error.message,
        status
      };
    }

    // Fallback for unexpected error formats
    return { 
      success: false, 
      error: String(error),
      status: 500
    };
  }

  /**
   * Make a request to the API
   * 
   * @param method The HTTP method
   * @param path The API endpoint path
   * @param body The request body (if any)
   * @returns A promise that resolves to the API response or an error response
   */
  private async request<T extends ApiResponse>(
    method: string, 
    path: string, 
    body: any = null,
    operation: string
  ): Promise<T | ErrorResponse> {
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
  
    try {
      const response = await fetch(url, options);
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
        
        return {
          success: false,
          error: errorMessage,
          status: response.status
        };
      }
  
      try {
        const data = JSON.parse(responseText);
        return data as T;
      } catch (parseError) {
        return {
          success: false,
          error: `Failed to parse successful response: ${parseError}`,
          status: 500
        };
      }
    } catch (networkError) {
      return this.handleApiError(networkError, operation);
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
   * Get your team profile information
   * 
   * @returns Team profile information or error response
   */
  async getProfile(): Promise<TeamProfileResponse | ErrorResponse> {
    return this.request<TeamProfileResponse>(
      'GET', 
      '/api/account/profile',
      null,
      'get team profile'
    );
  }

  /**
   * Update your team profile information
   * 
   * @param contactPerson New contact person name (optional)
   * @param metadata New metadata object (optional)
   * @returns Updated team profile information or error response
   */
  async updateProfile(
    contactPerson?: string, 
    metadata?: TeamMetadata
  ): Promise<TeamProfileResponse | ErrorResponse> {
    const body: { contactPerson?: string; metadata?: TeamMetadata } = {};
    
    if (contactPerson !== undefined) {
      body.contactPerson = contactPerson;
    }
    
    if (metadata !== undefined) {
      body.metadata = metadata;
    }
    
    return this.request<TeamProfileResponse>(
      'PUT', 
      '/api/account/profile', 
      body,
      'update team profile'
    );
  }

  /**
   * Get your team's token balances across all supported chains
   * 
   * @returns Balance information including tokens on all chains or error response
   */
  async getBalances(): Promise<BalancesResponse | ErrorResponse> {
    return this.request<BalancesResponse>(
      'GET', 
      '/api/account/balances',
      null,
      'get balances'
    );
  }

  /**
   * Get your team's portfolio information
   * 
   * @returns Portfolio information including positions and total value or error response
   */
  async getPortfolio(): Promise<PortfolioResponse | ErrorResponse> {
    return this.request<PortfolioResponse>(
      'GET', 
      '/api/account/portfolio',
      null,
      'get portfolio'
    );
  }

  /**
   * Get trade history
   * 
   * @param options Optional parameters to filter the trade history
   * @returns Trade history or error response
   */
  async getTradeHistory(options?: TradeHistoryParams): Promise<TradeHistoryResponse | ErrorResponse> {
    let path = '/api/account/trades';
    
    // Add query parameters if provided
    if (options) {
      const params = new URLSearchParams();
      
      if (options.limit !== undefined) {
        params.append('limit', options.limit.toString());
      }
      
      if (options.offset !== undefined) {
        params.append('offset', options.offset.toString());
      }
      
      if (options.token) {
        params.append('token', options.token);
      }
      
      if (options.chain) {
        params.append('chain', options.chain);
      }
      
      // Append query string if we have parameters
      const queryString = params.toString();
      if (queryString) {
        path += `?${queryString}`;
      }
    }
    
    return this.request<TradeHistoryResponse>(
      'GET', 
      path,
      null,
      'get trade history'
    );
  }

  /**
   * Get the current price for a token
   * 
   * @param token The token address to get the price for
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @param specificChain Optional specific chain for EVM tokens (like eth, polygon, base, etc.)
   * @returns A promise that resolves to the price response or error response
   */
  async getPrice(
    token: string,
    chain?: BlockchainType,
    specificChain?: SpecificChain
  ): Promise<PriceResponse | ErrorResponse> {
    const params = new URLSearchParams();
    params.append('token', token);
    
    if (chain) params.append('chain', chain);
    if (specificChain) params.append('specificChain', specificChain);
    
    return this.request<PriceResponse>(
      'GET', 
      `/api/price?${params.toString()}`,
      null,
      'get token price'
    );
  }

  /**
   * Get detailed token information including specific chain
   * 
   * @param token The token address
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @param specificChain Optional specific chain for EVM tokens
   * @returns A promise that resolves to the token info response or error response
   */
  async getTokenInfo(
    token: string,
    chain?: BlockchainType,
    specificChain?: SpecificChain
  ): Promise<TokenInfoResponse | ErrorResponse> {
    const params = new URLSearchParams();
    params.append('token', token);
    
    if (chain) params.append('chain', chain);
    if (specificChain) params.append('specificChain', specificChain);
    
    return this.request<TokenInfoResponse>(
      'GET', 
      `/api/price/token-info?${params.toString()}`,
      null,
      'get token info'
    );
  }

  /**
   * Get historical price data for a token
   * 
   * @param params Parameters for the price history request
   * @returns A promise that resolves to the price history response or error response
   */
  async getPriceHistory(
    tokenOrParams: string | PriceHistoryParams,
    interval?: string,
    chain?: BlockchainType,
    specificChain?: SpecificChain,
    startTime?: string,
    endTime?: string
  ): Promise<PriceHistoryResponse | ErrorResponse> {
    const urlParams = new URLSearchParams();
    
    // Handle both object-based and individual parameter calls
    if (typeof tokenOrParams === 'object') {
      // Object parameter version
      const params = tokenOrParams;
      urlParams.append('token', params.token);
      
      if (params.startTime) urlParams.append('startTime', params.startTime);
      if (params.endTime) urlParams.append('endTime', params.endTime);
      if (params.interval) urlParams.append('interval', params.interval);
      if (params.chain) urlParams.append('chain', params.chain);
      if (params.specificChain) urlParams.append('specificChain', params.specificChain);
    } else {
      // Individual parameters version
      urlParams.append('token', tokenOrParams);
      
      if (interval) urlParams.append('interval', interval);
      if (chain) urlParams.append('chain', chain);
      if (specificChain) urlParams.append('specificChain', specificChain);
      if (startTime) urlParams.append('startTime', startTime);
      if (endTime) urlParams.append('endTime', endTime);
    }

    return this.request<PriceHistoryResponse>(
      'GET', 
      `/api/price/history?${urlParams.toString()}`,
      null,
      'get price history'
    );
  }

  /**
   * Find token chain information from common tokens
   * 
   * @param token The token address
   * @returns Chain information or null if not found
   */
  private findTokenChainInfo(token: string): { chain: BlockchainType, specificChain: SpecificChain } | null {
    // Check SVM tokens
    for (const chainType in COMMON_TOKENS.SVM) {
      const tokens = COMMON_TOKENS.SVM[chainType as keyof typeof COMMON_TOKENS.SVM];
      for (const symbolKey in tokens) {
        if (tokens[symbolKey as keyof typeof tokens] === token) {
          return {
            chain: BlockchainType.SVM,
            specificChain: SpecificChain.SVM
          };
        }
      }
    }
    
    // Check EVM tokens
    for (const network in COMMON_TOKENS.EVM) {
      const tokens = COMMON_TOKENS.EVM[network as keyof typeof COMMON_TOKENS.EVM];
      for (const symbolKey in tokens) {
        if (tokens[symbolKey as keyof typeof tokens] === token) {
          return {
            chain: BlockchainType.EVM,
            specificChain: network as unknown as SpecificChain
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Execute a trade between two tokens
   * 
   * @param params Trade execution parameters
   * @returns A promise that resolves to the trade response or error response
   */
  async executeTrade(params: TradeParams): Promise<TradeResponse | ErrorResponse> {
    if (this.debug) {
      logger.info('[ApiClient] executeTrade called with params:', JSON.stringify(params, null, 2));
    }

    return this.request<TradeResponse>(
      'POST',
      '/api/trade/execute',
      params,
      'execute trade'
    );
  }

  /**
   * Get a quote for a potential trade
   * 
   * @param fromToken The source token address
   * @param toToken The destination token address
   * @param amount The amount of fromToken to trade
   * @param fromChain Optional source chain type
   * @param toChain Optional destination chain type
   * @param fromSpecificChain Optional specific chain for the source token
   * @param toSpecificChain Optional specific chain for the destination token
   * @returns A promise that resolves to the quote response or error response
   */
  async getQuote(
    fromToken: string,
    toToken: string,
    amount: string,
    fromChain?: BlockchainType,
    toChain?: BlockchainType,
    fromSpecificChain?: SpecificChain,
    toSpecificChain?: SpecificChain
  ): Promise<QuoteResponse | ErrorResponse> {
    const params = new URLSearchParams();
    params.append('fromToken', fromToken);
    params.append('toToken', toToken);
    params.append('amount', amount);
    
    if (fromChain) {
      params.append('fromChain', fromChain);
    }
    
    if (toChain) {
      params.append('toChain', toChain);
    }
    
    if (fromSpecificChain) {
      params.append('fromSpecificChain', fromSpecificChain);
    }
    
    if (toSpecificChain) {
      params.append('toSpecificChain', toSpecificChain);
    }
    
    return this.request<QuoteResponse>(
      'GET',
      `/api/trade/quote?${params.toString()}`,
      null,
      'get quote'
    );
  }

  /**
   * Get the status of the current competition
   * 
   * @returns A promise that resolves to the competition status response or error response
   */
  async getCompetitionStatus(): Promise<CompetitionStatusResponse | ErrorResponse> {
    return this.request<CompetitionStatusResponse>(
      'GET', 
      '/api/competition/status',
      null,
      'get competition status'
    );
  }

  /**
   * Get the leaderboard for the active competition
   * 
   * @param competitionId Optional competition ID (if not provided, the active competition is used)
   * @returns A promise that resolves to the leaderboard response or error response
   */
  async getLeaderboard(competitionId?: string): Promise<LeaderboardResponse | ErrorResponse> {
    let query = '';
    if (competitionId) {
      query = `?competitionId=${encodeURIComponent(competitionId)}`;
    }
    
    return this.request<LeaderboardResponse>(
      'GET', 
      `/api/competition/leaderboard${query}`,
      null,
      'get leaderboard'
    );
  }

  /**
   * Get competition rules
   * 
   * @returns A promise that resolves to the competition rules response or error response
   */
  async getRules(): Promise<CompetitionRulesResponse | ErrorResponse> {
    return this.request<CompetitionRulesResponse>(
      'GET',
      '/api/competition/rules',
      null,
      'get competition rules'
    );
  }

  /**
   * Get basic health status of the API
   * 
   * @returns A promise that resolves to the health status response or error response
   */
  async getHealthStatus(): Promise<HealthCheckResponse | ErrorResponse> {
    return this.request<HealthCheckResponse>(
      'GET',
      '/api/health',
      null,
      'get health status'
    );
  }

  /**
   * Get detailed health status of the API and its services
   * 
   * @returns A promise that resolves to the detailed health status response or error response
   */
  async getDetailedHealthStatus(): Promise<DetailedHealthCheckResponse | ErrorResponse> {
    return this.request<DetailedHealthCheckResponse>(
      'GET',
      '/api/health/detailed',
      null,
      'get detailed health status'
    );
  }
}

// Export a pre-configured instance of the client
export const tradingClient = new TradingSimulatorClient(); 