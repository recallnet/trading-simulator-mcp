/**
 * Trading Simulator API Client
 *
 * This module provides a client for interacting with the Trading Simulator API.
 * It handles authentication, request formatting, and response parsing for all
 * supported API endpoints.
 *
 * @module api-client
 */

import { config, logger } from "./env.js";
import {
  BalancesResponse,
  BlockchainType,
  COMMON_TOKENS,
  CompetitionRulesResponse,
  CompetitionStatusResponse,
  LeaderboardResponse,
  PortfolioResponse,
  PriceHistoryParams,
  PriceHistoryResponse,
  PriceResponse,
  QuoteResponse,
  SpecificChain,
  TokenInfoResponse,
  TradeExecutionResponse,
  TradeHistoryParams,
  TradeParams,
  TradesResponse,
} from "./types.js";

/**
 * Trading Simulator API Client
 *
 * Handles authentication and provides methods for interacting
 * with the Trading Simulator API.
 */
export class TradingSimulatorClient {
  /** API key for authentication */
  private apiKey: string;
  /** Base URL of the Trading Simulator API */
  private baseUrl: string;
  /** Debug mode flag */
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
    debug: boolean = config.DEBUG,
  ) {
    // Trim the API key to avoid whitespace issues (if provided)
    const providedKey = apiKey || config.TRADING_SIM_API_KEY;
    this.apiKey = providedKey ? providedKey.trim() : "";

    // Check for empty API key but don't throw - this allows client creation
    // but will fail on actual API calls
    if (!this.apiKey) {
      logger.error(
        "No API key provided. API calls will fail until a key is set.",
      );
    }

    // Normalize the base URL to ensure no trailing slash
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.debug = debug;
  }

  /**
   * Generate the required headers for API authentication
   *
   * Creates authorization and content-type headers for API requests
   *
   * @returns An object containing the required headers
   */
  private generateHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "TradingSimMCP/1.0",
    };

    if (this.debug) {
      logger.info("[ApiClient] Request headers:");
      logger.info("[ApiClient] Authorization: Bearer xxxxx... (masked)");
      logger.info("[ApiClient] Content-Type:", headers["Content-Type"]);
    }

    return headers;
  }

  /**
   * Make a request to the API
   *
   * Generic method to handle HTTP requests to the Trading Simulator API
   *
   * @param method The HTTP method (GET, POST, etc.)
   * @param path The API endpoint path
   * @param body The request body (if any)
   * @returns A promise that resolves to the API response
   * @throws Error if the network request fails or returns an error status
   */
  private async request<T>(
    method: string,
    path: string,
    body: any = null,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const bodyString = body ? JSON.stringify(body) : undefined;
    const headers = this.generateHeaders();

    const options: RequestInit = {
      method: method.toUpperCase(),
      headers,
      body: bodyString,
    };

    if (this.debug) {
      logger.info("[ApiClient] Request details:");
      logger.info("[ApiClient] Method:", method);
      logger.info("[ApiClient] URL:", url);
      logger.info(
        "[ApiClient] Body:",
        body ? JSON.stringify(body, null, 2) : "none",
      );
    }

    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (networkError) {
      logger.error("[ApiClient] Network error during fetch:", networkError);
      throw new Error("Network error occurred while making API request.");
    }

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      if (responseText.trim()) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage =
            errorData.error?.message || errorData.message || errorMessage;
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
   * Analyzes the token address format to determine if it's an EVM or SVM address
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
   * Retrieves balance information for all tokens held by the team
   *
   * @returns A promise that resolves to balance information including tokens on all chains
   * @throws Error if the API request fails
   */
  async getBalances(): Promise<BalancesResponse> {
    return this.request<BalancesResponse>("GET", "/api/account/balances");
  }

  /**
   * Get your team's portfolio information
   *
   * Retrieves detailed portfolio information including positions and total value
   *
   * @returns A promise that resolves to portfolio information
   * @throws Error if the API request fails
   */
  async getPortfolio(): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>("GET", "/api/account/portfolio");
  }

  /**
   * Get the trade history for your team
   *
   * Retrieves past trades with optional filtering
   *
   * @param options Optional filtering parameters (limit, offset, token, chain)
   * @returns A promise that resolves to the trade history response
   * @throws Error if the API request fails
   */
  async getTrades(options?: TradeHistoryParams): Promise<TradesResponse> {
    let query = "";

    if (options) {
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", options.limit.toString());
      if (options.offset) params.append("offset", options.offset.toString());
      if (options.token) params.append("token", options.token);
      if (options.chain) params.append("chain", options.chain);
      query = `?${params.toString()}`;
    }

    return this.request<TradesResponse>("GET", `/api/account/trades${query}`);
  }

  /**
   * Get the current price for a token
   *
   * Retrieves the current market price for a specific token
   *
   * @param token The token address to get the price for
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @param specificChain Optional specific chain for EVM tokens (like eth, polygon, base, etc.)
   * @returns A promise that resolves to the price response
   * @throws Error if the API request fails or token is invalid
   */
  async getPrice(
    token: string,
    chain?: BlockchainType,
    specificChain?: SpecificChain,
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

    return this.request<PriceResponse>("GET", `/api/price${query}`);
  }

  /**
   * Get detailed token information including specific chain
   *
   * Retrieves extended information about a token
   *
   * @param token The token address
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @param specificChain Optional specific chain for EVM tokens
   * @returns A promise that resolves to the token info response
   * @throws Error if the API request fails or token is invalid
   */
  async getTokenInfo(
    token: string,
    chain?: BlockchainType,
    specificChain?: SpecificChain,
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

    return this.request<TokenInfoResponse>(
      "GET",
      `/api/price/token-info${query}`,
    );
  }

  /**
   * Get historical price data for a token
   *
   * Retrieves price history for a specific token with customizable time range and intervals
   *
   * @param params Parameters for the price history request
   * @returns A promise that resolves to the price history response
   * @throws Error if the API request fails or parameters are invalid
   */
  async getPriceHistory(
    params: PriceHistoryParams,
  ): Promise<PriceHistoryResponse> {
    const urlParams = new URLSearchParams();
    urlParams.append("token", params.token);

    if (params.startTime) urlParams.append("startTime", params.startTime);
    if (params.endTime) urlParams.append("endTime", params.endTime);
    if (params.interval) urlParams.append("interval", params.interval);
    if (params.chain) urlParams.append("chain", params.chain);
    if (params.specificChain)
      urlParams.append("specificChain", params.specificChain);

    const query = `?${urlParams.toString()}`;
    return this.request<PriceHistoryResponse>(
      "GET",
      `/api/price/history${query}`,
    );
  }

  /**
   * Find token in COMMON_TOKENS and determine its chain information
   *
   * Looks up a token in the predefined COMMON_TOKENS list to determine its
   * blockchain type and specific chain
   *
   * @param token The token address to find
   * @returns An object with chain and specificChain if found, null otherwise
   */
  private findTokenChainInfo(
    token: string,
  ): { chain: BlockchainType; specificChain: SpecificChain } | null {
    // Check SVM tokens
    if (COMMON_TOKENS.SVM) {
      for (const [specificChain, tokens] of Object.entries(COMMON_TOKENS.SVM)) {
        for (const [_, address] of Object.entries(tokens)) {
          if (address === token) {
            return {
              chain: BlockchainType.SVM,
              specificChain: SpecificChain.SVM,
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
              specificChain: specificChain as SpecificChain,
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
   * Performs a trade from one token to another with the specified amount
   *
   * @param params Trade parameters including source/destination tokens and amount
   * @returns A promise that resolves to the trade execution response
   * @throws Error if the API request fails or parameters are invalid
   */
  async executeTrade(params: TradeParams): Promise<TradeExecutionResponse> {
    // Create the request payload
    const payload: any = {
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
    };

    // Add optional parameters if they exist
    if (params.slippageTolerance)
      payload.slippageTolerance = params.slippageTolerance;
    if (params.fromChain) payload.fromChain = params.fromChain;
    if (params.toChain) payload.toChain = params.toChain;
    if (params.fromSpecificChain)
      payload.fromSpecificChain = params.fromSpecificChain;
    if (params.toSpecificChain)
      payload.toSpecificChain = params.toSpecificChain;

    // If chain parameters are not provided, try to detect them
    if (!params.fromChain) {
      payload.fromChain = this.detectChain(params.fromToken);
    }

    if (!params.toChain) {
      payload.toChain = this.detectChain(params.toToken);
    }

    // Make the API request
    return this.request<TradeExecutionResponse>(
      "POST",
      "/api/trade/execute",
      payload,
    );
  }

  /**
   * Get a quote for a potential trade
   *
   * Retrieves an estimate of the resulting amount for a trade without executing it
   *
   * @param fromToken Source token address
   * @param toToken Destination token address
   * @param amount Amount of fromToken to trade
   * @returns A promise that resolves to the quote response
   * @throws Error if the API request fails or parameters are invalid
   */
  async getQuote(
    fromToken: string,
    toToken: string,
    amount: string,
  ): Promise<QuoteResponse> {
    const query = `?fromToken=${encodeURIComponent(fromToken)}&toToken=${encodeURIComponent(toToken)}&amount=${encodeURIComponent(amount)}`;

    return this.request<QuoteResponse>("GET", `/api/trade/quote${query}`);
  }

  /**
   * Get the status of the current competition
   *
   * Retrieves information about the current trading competition
   *
   * @returns A promise that resolves to the competition status response
   * @throws Error if the API request fails
   */
  async getCompetitionStatus(): Promise<CompetitionStatusResponse> {
    return this.request<CompetitionStatusResponse>(
      "GET",
      "/api/competition/status",
    );
  }

  /**
   * Get the leaderboard for the current competition
   *
   * Retrieves the current standings in the trading competition
   *
   * @param competitionId Optional ID of a specific competition (uses active competition by default)
   * @returns A promise that resolves to the leaderboard response
   * @throws Error if the API request fails
   */
  async getLeaderboard(competitionId?: string): Promise<LeaderboardResponse> {
    const path = competitionId
      ? `/api/competition/leaderboard?competitionId=${competitionId}`
      : "/api/competition/leaderboard";

    return this.request<LeaderboardResponse>("GET", path);
  }

  /**
   * Get the rules for the current competition
   *
   * Retrieves the rules and parameters for the current competition
   *
   * @returns A promise that resolves to the competition rules response
   * @throws Error if the API request fails
   */
  async getCompetitionRules(): Promise<CompetitionRulesResponse> {
    return this.request<CompetitionRulesResponse>(
      "GET",
      "/api/competition/rules",
    );
  }

  /**
   * Get the list of supported coin lists
   *
   * Admin-only endpoint to retrieve available coin lists
   *
   * @returns A promise that resolves to the coin lists response
   * @throws Error if the API request fails or user lacks permissions
   */
  async findCoinLists(): Promise<any> {
    try {
      return this.request("GET", "/api/admin/coin-lists");
    } catch (error) {
      logger.error("Error in findCoinLists:", error);
      throw error;
    }
  }

  /**
   * Get token exchange rates
   *
   * Retrieves current exchange rates between tokens
   *
   * @returns A promise that resolves to the token rates response
   * @throws Error if the API request fails
   */
  async getTokenRates(): Promise<any> {
    try {
      return this.request("GET", "/api/price/token-rates");
    } catch (error) {
      logger.error("Error in getTokenRates:", error);
      throw error;
    }
  }
}

/**
 * Singleton instance of the Trading Simulator client
 *
 * This is the default client instance to use throughout the application
 */
export const tradingClient = new TradingSimulatorClient();
