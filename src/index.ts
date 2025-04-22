#!/usr/bin/env node

/**
 * Trading Simulator MCP Server
 *
 * This file implements a Model Context Protocol (MCP) server for interfacing with the Trading Simulator API.
 * It provides a set of tools that allow AI agents to interact with the trading platform, get price information,
 * execute trades, and manage portfolios.
 *
 * @module trading-simulator-mcp
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { tradingClient } from "./api-client.js";
import { logger } from "./env.js";
import {
  BlockchainType,
  PriceHistoryParams,
  SpecificChain,
  TradeHistoryParams,
  TradeParams,
} from "./types.js";

/**
 * Define Zod schemas for tool input validation
 */

// Blockchain type enum schema
const blockchainTypeSchema = z.enum([BlockchainType.EVM, BlockchainType.SVM])
  .describe("Blockchain type (Ethereum Virtual Machine or Solana Virtual Machine)");

// Specific chain enum schema
const specificChainSchema = z.enum([
  SpecificChain.ETH,
  SpecificChain.POLYGON,
  SpecificChain.BSC,
  SpecificChain.ARBITRUM,
  SpecificChain.BASE,
  SpecificChain.OPTIMISM,
  SpecificChain.AVALANCHE,
  SpecificChain.LINEA,
  SpecificChain.SVM,
]).describe("Specific blockchain network to use");

// Time interval for price history
const timeIntervalSchema = z.enum(["1m", "5m", "15m", "1h", "4h", "1d"])
  .describe("Time interval for price points (e.g., '1h' for hourly data)");

// Empty schema for endpoints that don't require parameters
const emptySchema = z.object({}).strict();

// Trade history parameters schema
const tradeHistorySchema = z.object({
  limit: z.number().int().positive().optional()
    .describe("Maximum number of trades to return (for pagination)"),
  offset: z.number().int().nonnegative().optional()
    .describe("Offset for pagination (0-based)"),
  token: z.string().optional()
    .describe("Filter by specific token address"),
  chain: blockchainTypeSchema.optional()
    .describe("Filter by blockchain type"),
}).strict();

// Price query schema
const priceQuerySchema = z.object({
  token: z.string()
    .describe("Token address to get price for"),
  chain: blockchainTypeSchema.optional()
    .describe("Blockchain type (auto-detected if not provided)"),
  specificChain: specificChainSchema.optional()
    .describe("Specific chain for EVM tokens (like eth, polygon, base, etc.)"),
}).strict();

// Price history parameters schema
const priceHistorySchema = z.object({
  token: z.string()
    .describe("Token address to get price history for"),
  startTime: z.string().optional()
    .describe("Start time as ISO timestamp (e.g., '2023-01-01T00:00:00Z')"),
  endTime: z.string().optional()
    .describe("End time as ISO timestamp (e.g., '2023-01-31T23:59:59Z')"),
  interval: timeIntervalSchema.optional()
    .describe("Time interval for price points"),
  chain: blockchainTypeSchema.optional()
    .describe("Blockchain type (auto-detected if not provided)"),
  specificChain: specificChainSchema.optional()
    .describe("Specific chain for EVM tokens"),
}).strict();

// Trade execution parameters schema
const tradeExecutionSchema = z.object({
  fromToken: z.string()
    .describe("Source token address"),
  toToken: z.string()
    .describe("Destination token address"),
  amount: z.string()
    .describe("Amount of fromToken to trade (as a decimal string)"),
  slippageTolerance: z.string().optional()
    .describe("Slippage tolerance percentage (e.g., '0.5' for 0.5%)"),
}).strict();

// Quote parameters schema
const quoteSchema = z.object({
  fromToken: z.string()
    .describe("Source token address"),
  toToken: z.string()
    .describe("Destination token address"),
  amount: z.string()
    .describe("Amount of fromToken to potentially trade (as a decimal string)"),
}).strict();

// Leaderboard parameters schema
const leaderboardSchema = z.object({
  competitionId: z.string().optional()
    .describe("Optional ID of a specific competition (uses active competition by default)"),
}).strict();

/**
 * Create JSON Schema objects for the MCP tools
 * Each schema is manually defined to match the Zod schema
 */

// Empty schema as JSON Schema
const emptyJsonSchema = {
  type: "object" as const,
  properties: {},
  additionalProperties: false,
  $schema: "http://json-schema.org/draft-07/schema#",
};

// Trade history JSON Schema
const tradeHistoryJsonSchema = {
  type: "object" as const,
  properties: {
    limit: {
      type: "number",
      description: "Maximum number of trades to return (for pagination)",
    },
    offset: {
      type: "number",
      description: "Offset for pagination (0-based)",
    },
    token: {
      type: "string",
      description: "Filter by specific token address",
    },
    chain: {
      type: "string",
      enum: ["svm", "evm"],
      description: "Filter by blockchain type",
    },
  },
  additionalProperties: false,
  $schema: "http://json-schema.org/draft-07/schema#",
};

// Price query JSON Schema
const priceQueryJsonSchema = {
  type: "object" as const,
  properties: {
    token: {
      type: "string",
      description: "Token address to get price for",
    },
    chain: {
      type: "string",
      enum: ["svm", "evm"],
      description: "Blockchain type (auto-detected if not provided)",
    },
    specificChain: {
      type: "string",
      enum: [
        "eth",
        "polygon",
        "bsc",
        "arbitrum",
        "base",
        "optimism",
        "avalanche",
        "linea",
        "svm",
      ],
      description: "Specific chain for EVM tokens (like eth, polygon, base, etc.)",
    },
  },
  required: ["token"],
  additionalProperties: false,
  $schema: "http://json-schema.org/draft-07/schema#",
};

// Price history JSON Schema
const priceHistoryJsonSchema = {
  type: "object" as const,
  properties: {
    token: {
      type: "string",
      description: "Token address to get price history for",
    },
    startTime: {
      type: "string",
      description: "Start time as ISO timestamp (e.g., '2023-01-01T00:00:00Z')",
    },
    endTime: {
      type: "string",
      description: "End time as ISO timestamp (e.g., '2023-01-31T23:59:59Z')",
    },
    interval: {
      type: "string",
      enum: ["1m", "5m", "15m", "1h", "4h", "1d"],
      description: "Time interval for price points",
    },
    chain: {
      type: "string",
      enum: ["svm", "evm"],
      description: "Blockchain type (auto-detected if not provided)",
    },
    specificChain: {
      type: "string",
      enum: [
        "eth",
        "polygon",
        "bsc",
        "arbitrum",
        "base",
        "optimism",
        "avalanche",
        "linea",
        "svm",
      ],
      description: "Specific chain for EVM tokens",
    },
  },
  required: ["token"],
  additionalProperties: false,
  $schema: "http://json-schema.org/draft-07/schema#",
};

// Trade execution JSON Schema
const tradeExecutionJsonSchema = {
  type: "object" as const,
  properties: {
    fromToken: {
      type: "string",
      description: "Source token address",
    },
    toToken: {
      type: "string",
      description: "Destination token address",
    },
    amount: {
      type: "string",
      description: "Amount of fromToken to trade (as a decimal string)",
    },
    slippageTolerance: {
      type: "string",
      description: "Slippage tolerance percentage (e.g., '0.5' for 0.5%)",
    },
  },
  required: ["fromToken", "toToken", "amount"],
  additionalProperties: false,
  $schema: "http://json-schema.org/draft-07/schema#",
};

// Quote JSON Schema
const quoteJsonSchema = {
  type: "object" as const,
  properties: {
    fromToken: {
      type: "string",
      description: "Source token address",
    },
    toToken: {
      type: "string",
      description: "Destination token address",
    },
    amount: {
      type: "string",
      description: "Amount of fromToken to potentially trade (as a decimal string)",
    },
  },
  required: ["fromToken", "toToken", "amount"],
  additionalProperties: false,
  $schema: "http://json-schema.org/draft-07/schema#",
};

// Leaderboard JSON Schema
const leaderboardJsonSchema = {
  type: "object" as const,
  properties: {
    competitionId: {
      type: "string",
      description: "Optional ID of a specific competition (uses active competition by default)",
    },
  },
  additionalProperties: false,
  $schema: "http://json-schema.org/draft-07/schema#",
};

/**
 * Create an MCP server instance using the Server class
 *
 * This server provides tools to interact with the Trading Simulator platform.
 * It supports tools for account management, price checking, and trading functionality.
 */
const server = new Server(
  {
    name: "trading-simulator-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {}, // We support tools
      resources: {}, // We support resources (even if we just return empty arrays)
      prompts: {}, // We support prompts (even if we just return empty arrays)
    },
  },
);

/**
 * Define the MCP tools available in this server
 *
 * Each tool represents a specific functionality that can be called by MCP clients.
 * Tools include account management, price information, and trading capabilities.
 */
const TRADING_SIM_TOOLS: Tool[] = [
  // Account Tools
  /**
   * Get token balances for your team
   *
   * Returns balances for all tokens in the team's portfolio across all supported chains.
   */
  {
    name: "get_balances",
    description: "Get token balances for your team across all supported chains",
    inputSchema: emptyJsonSchema,
  },
  {
    name: "get_portfolio",
    description: "Get detailed portfolio information including positions and total value",
    inputSchema: emptyJsonSchema,
  },
  {
    name: "get_trades",
    description: "Get trade history for your team with optional filtering parameters",
    inputSchema: tradeHistoryJsonSchema,
  },

  // Price Tools
  /**
   * Get the current price for a token
   *
   * Returns the current price of a token on the specified chain.
   */
  {
    name: "get_price",
    description: "Get the current market price for a specific token",
    inputSchema: priceQueryJsonSchema,
  },
  {
    name: "get_token_info",
    description: "Get detailed information about a token including name, symbol, and decimals",
    inputSchema: priceQueryJsonSchema,
  },
  {
    name: "get_price_history",
    description: "Get historical price data for a token with customizable time range and intervals",
    inputSchema: priceHistoryJsonSchema,
  },

  // Trading Tools
  /**
   * Execute a trade between two tokens
   *
   * Performs a trade from one token to another with the specified amount.
   */
  {
    name: "execute_trade",
    description: "Execute a trade from one token to another with the specified amount",
    inputSchema: tradeExecutionJsonSchema,
  },
  {
    name: "get_quote",
    description: "Get a quote for a potential trade without executing it",
    inputSchema: quoteJsonSchema,
  },

  // Competition Tools
  /**
   * Get the status of the current competition
   *
   * Returns information about the current trading competition.
   */
  {
    name: "get_competition_status",
    description: "Get information about the current trading competition",
    inputSchema: emptyJsonSchema,
  },
  {
    name: "get_leaderboard",
    description: "Get the current standings in the trading competition",
    inputSchema: leaderboardJsonSchema,
  },
];

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async (request, signal) => {
  // Check if the request has been aborted
  if (signal && 'aborted' in signal && signal.aborted) {
    return {
      tools: [],
    };
  }

  return {
    tools: TRADING_SIM_TOOLS,
  };
});

/**
 * Handle tool calls from MCP clients
 *
 * This handler processes incoming tool call requests, validates the parameters,
 * calls the appropriate API client method, and returns the results.
 */
server.setRequestHandler(CallToolRequestSchema, async (request, signal) => {
  // Check if the request has been aborted
  if (signal && 'aborted' in signal && signal.aborted) {
    return {
      content: [{ type: "text", text: "Request aborted" }],
      isError: true,
    };
  }

  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      // Account Tools
      case "get_balances": {
        try {
          // No parameters to validate
          const response = await tradingClient.getBalances();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in get_balances:", error);
          throw error;
        }
      }

      case "get_portfolio": {
        try {
          // No parameters to validate
          const response = await tradingClient.getPortfolio();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in get_portfolio:", error);
          throw error;
        }
      }

      case "get_trades": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments for get_trades");
        }

        try {
          // Validate using Zod schema
          const params = tradeHistorySchema.parse(args);

          const response = await tradingClient.getTrades(params);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in get_trades:", error);
          throw error;
        }
      }

      // Price Tools
      case "get_price": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments for get_price");
        }

        try {
          // Validate using Zod schema
          const { token, chain, specificChain } = priceQuerySchema.parse(args);

          const response = await tradingClient.getPrice(
            token,
            chain,
            specificChain,
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in get_price:", error);
          throw error;
        }
      }

      case "get_token_info": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments for get_token_info");
        }

        try {
          // Validate using Zod schema
          const { token, chain, specificChain } = priceQuerySchema.parse(args);

          const response = await tradingClient.getTokenInfo(
            token,
            chain,
            specificChain,
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in get_token_info:", error);
          throw error;
        }
      }

      case "get_price_history": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments for get_price_history");
        }

        try {
          // Validate using Zod schema
          const params = priceHistorySchema.parse(args);

          const response = await tradingClient.getPriceHistory(params);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in get_price_history:", error);
          throw error;
        }
      }

      // Trading Tools
      case "execute_trade": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments for execute_trade");
        }

        try {
          // Validate using Zod schema
          const { fromToken, toToken, amount, slippageTolerance } = tradeExecutionSchema.parse(args);

          const params: TradeParams = {
            fromToken,
            toToken,
            amount,
          };

          if (slippageTolerance) {
            params.slippageTolerance = slippageTolerance;
          }

          // Determine chains automatically from token addresses
          params.fromChain = tradingClient.detectChain(params.fromToken);
          params.toChain = tradingClient.detectChain(params.toToken);

          const response = await tradingClient.executeTrade(params);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in execute_trade:", error);
          throw error;
        }
      }

      case "get_quote": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments for get_quote");
        }

        try {
          // Validate using Zod schema
          const { fromToken, toToken, amount } = quoteSchema.parse(args);

          const response = await tradingClient.getQuote(
            fromToken,
            toToken,
            amount,
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in get_quote:", error);
          throw error;
        }
      }

      // Competition Tools
      case "get_competition_status": {
        try {
          // No parameters to validate
          const response = await tradingClient.getCompetitionStatus();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in get_competition_status:", error);
          throw error;
        }
      }

      case "get_leaderboard": {
        try {
          // Validate using Zod schema if args provided
          let competitionId: string | undefined;
          if (args && typeof args === 'object') {
            const validatedArgs = leaderboardSchema.parse(args);
            competitionId = validatedArgs.competitionId;
          }

          const response = await tradingClient.getLeaderboard(competitionId);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
            isError: false,
          };
        } catch (error: any) {
          logger.error("Error in get_leaderboard:", error);
          throw error;
        }
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Add support for resources/list and prompts/list methods
server.setRequestHandler(ListResourcesRequestSchema, async (request, signal) => {
  // Check if the request has been aborted
  if (signal && 'aborted' in signal && signal.aborted) {
    return { resources: [] };
  }

  return { resources: [] };
});

server.setRequestHandler(ListPromptsRequestSchema, async (request, signal) => {
  // Check if the request has been aborted
  if (signal && 'aborted' in signal && signal.aborted) {
    return { prompts: [] };
  }

  return { prompts: [] };
});

// Start the server using stdio transport
async function main() {
  // Add error event listeners for stdio streams
  process.stdout.on('error', (err) => {
    logger.error('Stdout error:', err);
  });

  process.stderr.on('error', (err) => {
    logger.error('Stderr error:', err);
  });

  process.stdin.on('error', (err) => {
    logger.error('Stdin error:', err);
  });

  // Implement keep-alive ping mechanism
  const PING_INTERVAL_MS = 30000; // 30 seconds
  const pingInterval = setInterval(() => {
    try {
      // Using a comment format that will be ignored by JSON parsers
      process.stdout.write('// ping\n');
    } catch (error) {
      logger.error('Failed to send keep-alive ping:', error);
    }
  }, PING_INTERVAL_MS);

  // Ensure the interval is cleared on exit
  process.on('exit', () => {
    clearInterval(pingInterval);
  });

  // Handle SIGINT (Ctrl+C) gracefully
  process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down gracefully...');
    clearInterval(pingInterval);
    process.exit(0);
  });

  // Handle SIGTERM gracefully
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down gracefully...');
    clearInterval(pingInterval);
    process.exit(0);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Trading Simulator MCP Server running on stdio");
}

main().catch(logger.error);
