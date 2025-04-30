#!/usr/bin/env node

import { logger } from './env.js';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import { tradingClient } from "./api-client.js";
import {
  BlockchainType,
  SpecificChain,
  PriceHistoryParams,
  TradeHistoryParams,
  TradeParams,
  TeamMetadata,
} from "./types.js";

// Create an MCP server instance using the Server class
const server = new Server(
  {
    name: "trading-simulator-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {},     // We support tools
      resources: {}, // We support resources (even if we just return empty arrays)
      prompts: {}    // We support prompts (even if we just return empty arrays)
    }
  }
);

// Define the MCP tools
const TRADING_SIM_TOOLS: Tool[] = [
  // Account Tools
  {
    name: "get_profile",
    description: "Get your team's profile information",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "update_profile",
    description: "Update your team's profile information",
    inputSchema: {
      type: "object",
      properties: {
        contactPerson: {
          type: "string",
          description: "New contact person name"
        },
        metadata: {
          type: "object",
          description: "Agent metadata with ref, description, and social information",
          properties: {
            ref: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Agent name"
                },
                version: {
                  type: "string",
                  description: "Agent version"
                },
                url: {
                  type: "string",
                  description: "Link to agent documentation or repository"
                }
              }
            },
            description: {
              type: "string",
              description: "Brief description of the agent"
            },
            social: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Agent social name"
                },
                email: {
                  type: "string",
                  description: "Contact email for the agent"
                },
                twitter: {
                  type: "string",
                  description: "Twitter handle"
                }
              }
            }
          }
        }
      },
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "get_balances",
    description: "Get token balances for your team",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "get_portfolio",
    description: "Get portfolio information for your team",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "get_trades",
    description: "Get trade history for your team",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of trades to retrieve (default: 20)"
        },
        offset: {
          type: "number",
          description: "Offset for pagination"
        },
        token: {
          type: "string",
          description: "Filter by token address"
        },
        chain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Filter by blockchain type"
        }
      },
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },

  // Price Tools
  {
    name: "get_price",
    description: "Get the current price for a token",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token address"
        },
        chain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type"
        },
        specificChain: {
          type: "string",
          enum: ["eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm"],
          description: "Optional specific chain for EVM tokens"
        }
      },
      required: ["token"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "get_token_info",
    description: "Get detailed information about a token",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token address"
        },
        chain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type"
        },
        specificChain: {
          type: "string",
          enum: ["eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm"],
          description: "Optional specific chain for EVM tokens"
        }
      },
      required: ["token"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "get_price_history",
    description: "Get historical price data for a token",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token address"
        },
        startTime: {
          type: "string",
          description: "Start time as ISO timestamp"
        },
        endTime: {
          type: "string",
          description: "End time as ISO timestamp"
        },
        interval: {
          type: "string",
          enum: ["1m", "5m", "15m", "1h", "4h", "1d"],
          description: "Time interval for price points"
        },
        chain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type"
        },
        specificChain: {
          type: "string",
          enum: ["eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm"],
          description: "Optional specific chain for EVM tokens"
        }
      },
      required: ["token"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },

  // Trading Tools
  {
    name: "execute_trade",
    description: "Execute a trade between tokens",
    inputSchema: {
      type: "object",
      properties: {
        fromToken: {
          type: "string", 
          description: "Source token address"
        },
        toToken: {
          type: "string", 
          description: "Destination token address"
        },
        amount: {
          type: "string", 
          description: "Amount of fromToken to trade"
        },
        reason: {
          type: "string",
          description: "Reason for executing this trade"
        },
        slippageTolerance: {
          type: "string",
          description: "Optional slippage tolerance percentage (e.g., '0.5' for 0.5%)"
        },
        fromChain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type for source token"
        },
        toChain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type for destination token"
        },
        fromSpecificChain: {
          type: "string",
          enum: ["eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm"],
          description: "Optional specific chain for source token"
        },
        toSpecificChain: {
          type: "string",
          enum: ["eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm"],
          description: "Optional specific chain for destination token"
        }
      },
      required: ["fromToken", "toToken", "amount", "reason"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "get_quote",
    description: "Get a quote for a potential trade",
    inputSchema: {
      type: "object",
      properties: {
        fromToken: {
          type: "string",
          description: "Source token address"
        },
        toToken: {
          type: "string",
          description: "Destination token address"
        },
        amount: {
          type: "string",
          description: "Amount of fromToken to potentially trade"
        },
        fromChain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type for source token"
        },
        toChain: {
          type: "string",
          enum: ["svm", "evm"],
          description: "Optional blockchain type for destination token"
        },
        fromSpecificChain: {
          type: "string",
          enum: ["eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm"],
          description: "Optional specific chain for source token"
        },
        toSpecificChain: {
          type: "string",
          enum: ["eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm"],
          description: "Optional specific chain for destination token"
        }
      },
      required: ["fromToken", "toToken", "amount"],
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },

  // Competition Tools
  {
    name: "get_competition_status",
    description: "Get the status of the current competition",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "get_leaderboard",
    description: "Get the competition leaderboard",
    inputSchema: {
      type: "object",
      properties: {
        competitionId: {
          type: "string",
          description: "Optional competition ID (if not provided, the active competition is used)"
        }
      },
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "get_competition_rules",
    description: "Get the rules and configuration details for the competition",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  
  // Health Tools
  {
    name: "get_health",
    description: "Basic health check for the trading simulator API",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    name: "get_detailed_health",
    description: "Detailed health check with information about all services",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
      $schema: "http://json-schema.org/draft-07/schema#"
    }
  }
];

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TRADING_SIM_TOOLS
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: []
  };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: []
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  logger.info(`Handling tool call: ${name}`);

  try {
    // Handle different tools
    switch (name) {
      // Account Tools
      case "get_profile": {
        const response = await tradingClient.getProfile();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      case "update_profile": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments for update_profile");
        }
        
        const contactPerson = "contactPerson" in args ? args.contactPerson as string : undefined;
        const metadata = "metadata" in args ? args.metadata as TeamMetadata : undefined;
        
        const response = await tradingClient.updateProfile(contactPerson, metadata);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
        
      case "get_balances": {
        const response = await tradingClient.getBalances();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      case "get_portfolio": {
        const response = await tradingClient.getPortfolio();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      case "get_trades": {
        if (!args || typeof args !== "object") {
          throw new Error("Invalid arguments for get_trades");
        }
        
        const tradeParams: TradeHistoryParams = {};
        if ("limit" in args) tradeParams.limit = args.limit as number;
        if ("offset" in args) tradeParams.offset = args.offset as number;
        if ("token" in args) tradeParams.token = args.token as string;
        if ("chain" in args) tradeParams.chain = args.chain as BlockchainType;
        
        const response = await tradingClient.getTradeHistory(tradeParams);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      // Price Tools
      case "get_price": {
        if (!args || typeof args !== "object" || !("token" in args)) {
          throw new Error("Invalid arguments for get_price");
        }
        
        const token = args.token as string;
        const chain = "chain" in args ? args.chain as BlockchainType : undefined;
        const specificChain = "specificChain" in args ? args.specificChain as SpecificChain : undefined;
        
        const response = await tradingClient.getPrice(token, chain, specificChain);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      case "get_token_info": {
        if (!args || typeof args !== "object" || !("token" in args)) {
          throw new Error("Invalid arguments for get_token_info");
        }
        
        const token = args.token as string;
        const chain = "chain" in args ? args.chain as BlockchainType : undefined;
        const specificChain = "specificChain" in args ? args.specificChain as SpecificChain : undefined;
        
        const response = await tradingClient.getTokenInfo(token, chain, specificChain);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      case "get_price_history": {
        if (!args || typeof args !== "object" || !("token" in args)) {
          throw new Error("Invalid arguments for get_price_history");
        }
        
        const historyParams: PriceHistoryParams = {
          token: args.token as string
        };
        
        if ("startTime" in args) historyParams.startTime = args.startTime as string;
        if ("endTime" in args) historyParams.endTime = args.endTime as string;
        if ("interval" in args) historyParams.interval = args.interval as PriceHistoryParams['interval'];
        if ("chain" in args) historyParams.chain = args.chain as BlockchainType;
        if ("specificChain" in args) historyParams.specificChain = args.specificChain as SpecificChain;
        
        const response = await tradingClient.getPriceHistory(historyParams);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      // Trading Tools
      case "execute_trade": {
        if (!args || typeof args !== "object" || 
            !("fromToken" in args) || !("toToken" in args) || 
            !("amount" in args) || !("reason" in args)) {
          throw new Error("Invalid arguments for execute_trade");
        }
        
        const tradeExecParams: TradeParams = {
          fromToken: args.fromToken as string,
          toToken: args.toToken as string,
          amount: args.amount as string,
          reason: args.reason as string
        };
        
        if ("slippageTolerance" in args) tradeExecParams.slippageTolerance = args.slippageTolerance as string;
        if ("fromChain" in args) tradeExecParams.fromChain = args.fromChain as BlockchainType;
        if ("toChain" in args) tradeExecParams.toChain = args.toChain as BlockchainType;
        if ("fromSpecificChain" in args) tradeExecParams.fromSpecificChain = args.fromSpecificChain as SpecificChain;
        if ("toSpecificChain" in args) tradeExecParams.toSpecificChain = args.toSpecificChain as SpecificChain;
        
        const response = await tradingClient.executeTrade(tradeExecParams);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      case "get_quote": {
        if (!args || typeof args !== "object" || 
            !("fromToken" in args) || !("toToken" in args) || !("amount" in args)) {
          throw new Error("Invalid arguments for get_quote");
        }
        
        const fromToken = args.fromToken as string;
        const toToken = args.toToken as string;
        const amount = args.amount as string;
        const fromChain = "fromChain" in args ? args.fromChain as BlockchainType : undefined;
        const toChain = "toChain" in args ? args.toChain as BlockchainType : undefined;
        const fromSpecificChain = "fromSpecificChain" in args ? args.fromSpecificChain as SpecificChain : undefined;
        const toSpecificChain = "toSpecificChain" in args ? args.toSpecificChain as SpecificChain : undefined;
        
        const response = await tradingClient.getQuote(
          fromToken, 
          toToken, 
          amount, 
          fromChain, 
          toChain, 
          fromSpecificChain, 
          toSpecificChain
        );
        
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      // Competition Tools
      case "get_competition_status": {
        const response = await tradingClient.getCompetitionStatus();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      case "get_leaderboard": {
        const competitionId = "competitionId" in args ? args.competitionId as string : undefined;
        const response = await tradingClient.getLeaderboard(competitionId);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      case "get_competition_rules": {
        const response = await tradingClient.getRules();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }
        
      // Health Tools
      case "get_health": {
        const response = await tradingClient.getHealthStatus();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
        
      case "get_detailed_health": {
        const response = await tradingClient.getDetailedHealthStatus();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }
      
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  } catch (error) {
    logger.error(`Error handling tool call ${name}:`, error);
    return {
      content: [{ 
        type: "text", 
        text: `Error: ${error instanceof Error ? error.message : String(error)}` 
      }],
      isError: true
    };
  }
});

async function main() {
  try {
    // Create a transport for stdio
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await server.connect(transport);
    logger.info("Trading Simulator MCP server started");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error); 
