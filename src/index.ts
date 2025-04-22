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
    description: "Get token balances for your team",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
  },
  {
    name: "get_portfolio",
    description: "Get portfolio information for your team",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
  },
  {
    name: "get_trades",
    description: "Get trade history for your team",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of trades to return",
        },
        offset: {
          type: "number",
          description: "Offset for pagination",
        },
        token: {
          type: "string",
          description: "Filter by token address",
        },
        chain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Filter by blockchain type",
        },
      },
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
  },

  // Price Tools
  /**
   * Get the current price for a token
   *
   * Returns the current price of a token on the specified chain.
   */
  {
    name: "get_price",
    description: "Get the current price for a token",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token address",
        },
        chain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type",
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
          description: "Optional specific chain for EVM tokens",
        },
      },
      required: ["token"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
  },
  {
    name: "get_token_info",
    description: "Get detailed information about a token",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token address",
        },
        chain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type",
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
          description: "Optional specific chain for EVM tokens",
        },
      },
      required: ["token"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
  },
  {
    name: "get_price_history",
    description: "Get historical price data for a token",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token address",
        },
        startTime: {
          type: "string",
          description: "Start time as ISO timestamp",
        },
        endTime: {
          type: "string",
          description: "End time as ISO timestamp",
        },
        interval: {
          type: "string",
          enum: ["1m", "5m", "15m", "1h", "4h", "1d"],
          description: "Time interval for price points",
        },
        chain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type",
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
          description: "Optional specific chain for EVM tokens",
        },
      },
      required: ["token"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
  },

  // Trading Tools
  /**
   * Execute a trade between two tokens
   *
   * Performs a trade from one token to another with the specified amount.
   */
  {
    name: "execute_trade",
    description: "Execute a trade between two tokens",
    inputSchema: {
      type: "object",
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
          description: "Amount of fromToken to trade",
        },
        slippageTolerance: {
          type: "string",
          description:
            "Optional slippage tolerance percentage (e.g., '0.5' for 0.5%)",
        },
      },
      required: ["fromToken", "toToken", "amount"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
  },
  {
    name: "get_quote",
    description: "Get a quote for a potential trade",
    inputSchema: {
      type: "object",
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
          description: "Amount of fromToken to potentially trade",
        },
      },
      required: ["fromToken", "toToken", "amount"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
  },

  // Competition Tools
  /**
   * Get the status of the current competition
   *
   * Returns information about the current trading competition.
   */
  {
    name: "get_competition_status",
    description: "Get the status of the current competition",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
  },
  {
    name: "get_leaderboard",
    description: "Get the competition leaderboard",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#",
    },
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
          const params: TradeHistoryParams = {};

          if ("limit" in args) params.limit = args.limit as number;
          if ("offset" in args) params.offset = args.offset as number;
          if ("token" in args) params.token = args.token as string;
          if ("chain" in args) params.chain = args.chain as BlockchainType;

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
        if (!args || typeof args !== "object" || !("token" in args)) {
          throw new Error("Invalid arguments for get_price");
        }

        try {
          const token = args.token as string;
          const chain = args.chain as BlockchainType | undefined;
          const specificChain = args.specificChain as SpecificChain | undefined;

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
        if (!args || typeof args !== "object" || !("token" in args)) {
          throw new Error("Invalid arguments for get_token_info");
        }

        try {
          const token = args.token as string;
          const chain = args.chain as BlockchainType | undefined;
          const specificChain = args.specificChain as SpecificChain | undefined;

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
        if (!args || typeof args !== "object" || !("token" in args)) {
          throw new Error("Invalid arguments for get_price_history");
        }

        try {
          const params: PriceHistoryParams = {
            token: args.token as string,
          };

          if ("startTime" in args) params.startTime = args.startTime as string;
          if ("endTime" in args) params.endTime = args.endTime as string;
          if ("interval" in args)
            params.interval = args.interval as
              | "1m"
              | "5m"
              | "15m"
              | "1h"
              | "4h"
              | "1d";
          if ("chain" in args) params.chain = args.chain as BlockchainType;
          if ("specificChain" in args)
            params.specificChain = args.specificChain as SpecificChain;

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
        if (
          !args ||
          typeof args !== "object" ||
          !("fromToken" in args) ||
          !("toToken" in args) ||
          !("amount" in args)
        ) {
          throw new Error("Invalid arguments for execute_trade");
        }

        try {
          const params: TradeParams = {
            fromToken: args.fromToken as string,
            toToken: args.toToken as string,
            amount: args.amount as string,
          };

          if ("slippageTolerance" in args)
            params.slippageTolerance = args.slippageTolerance as string;

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
        if (
          !args ||
          typeof args !== "object" ||
          !("fromToken" in args) ||
          !("toToken" in args) ||
          !("amount" in args)
        ) {
          throw new Error("Invalid arguments for get_quote");
        }

        try {
          const fromToken = args.fromToken as string;
          const toToken = args.toToken as string;
          const amount = args.amount as string;

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
          const response = await tradingClient.getLeaderboard();

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
