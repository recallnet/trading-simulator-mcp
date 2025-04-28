// Using dynamic imports to handle ESM compatibility
const mcpEvalsPromise = import('mcp-evals');
const aiSdkPromise = import('@ai-sdk/openai');

// Immediately invoked async function to set up the module
const setupModule = async () => {
  const mcpEvalsImport = await mcpEvalsPromise;
  const aiSdkImport = await aiSdkPromise;

  // Use type assertions to handle the imports
  const { grade } = mcpEvalsImport;
  const { openai } = aiSdkImport;

  // Account Tools Evaluations
  const getBalancesEval = {
    name: 'Get Balances Evaluation',
    description: 'Evaluates the accuracy and completeness of token balance retrieval',
    run: async () => {
      const result = await grade(openai("gpt-4"), "What are the current token balances in my portfolio?");
      return JSON.parse(result);
    }
  };

  const getPortfolioEval = {
    name: 'Get Portfolio Evaluation',
    description: 'Evaluates the accuracy and completeness of portfolio information retrieval',
    run: async () => {
      const result = await grade(openai("gpt-4"), "Show me my portfolio information including token valuations and total value.");
      return JSON.parse(result);
    }
  };

  const getTradesEval = {
    name: 'Get Trades Evaluation',
    description: 'Evaluates the accuracy and completeness of trade history retrieval',
    run: async () => {
      const result = await grade(openai("gpt-4"), "Show me my recent 5 trades. Filter for just the EVM blockchain if possible.");
      return JSON.parse(result);
    }
  };

  // Price Tools Evaluations
  const getPriceEval = {
    name: 'Get Price Evaluation',
    description: 'Evaluates the accuracy of token price retrieval',
    run: async () => {
      const result = await grade(openai("gpt-4"), "What is the current price of WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) on Ethereum?");
      return JSON.parse(result);
    }
  };

  const getTokenInfoEval = {
    name: 'Get Token Info Evaluation',
    description: 'Evaluates the accuracy and completeness of token information retrieval',
    run: async () => {
      const result = await grade(openai("gpt-4"), "Get me detailed information about USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) including its name, symbol, and decimals.");
      return JSON.parse(result);
    }
  };

  const getPriceHistoryEval = {
    name: 'Get Price History Evaluation',
    description: 'Evaluates the accuracy and completeness of historical price data retrieval',
    run: async () => {
      const result = await grade(openai("gpt-4"), "Show me the price history of WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) for the last 24 hours with 1-hour intervals.");
      return JSON.parse(result);
    }
  };

  // Trading Tools Evaluations
  const executeTradeEval = {
    name: 'Execute Trade Evaluation',
    description: 'Evaluates the functionality and correctness of executing trades between tokens',
    run: async () => {
      const result = await grade(openai("gpt-4"), "Execute a trade of 0.01 WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) to USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) with a 0.5% slippage tolerance.");
      return JSON.parse(result);
    }
  };

  const getQuoteEval = {
    name: 'Get Quote Evaluation',
    description: 'Evaluates the accuracy and completeness of trade quote retrieval',
    run: async () => {
      const result = await grade(openai("gpt-4"), "Get me a quote for trading 0.05 WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) to USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48).");
      return JSON.parse(result);
    }
  };

  // Solana token evaluation
  const solanaTokenEval = {
    name: 'Solana Token Evaluation',
    description: 'Evaluates the functionality of the system with Solana tokens',
    run: async () => {
      const result = await grade(openai("gpt-4"), "What is the current price of SOL (So11111111111111111111111111111111111111112) on the Solana blockchain?");
      return JSON.parse(result);
    }
  };

  // Competition Tools Evaluations
  const getCompetitionStatusEval = {
    name: 'Get Competition Status Evaluation',
    description: 'Evaluates the accuracy and completeness of competition status information',
    run: async () => {
      const result = await grade(openai("gpt-4"), "What is the current status of the trading competition? When did it start and when will it end?");
      return JSON.parse(result);
    }
  };

  const getLeaderboardEval = {
    name: 'Get Leaderboard Evaluation',
    description: 'Evaluates the accuracy and completeness of competition leaderboard information',
    run: async () => {
      const result = await grade(openai("gpt-4"), "Show me the current trading competition leaderboard. Who's in the top positions and what are their portfolio values?");
      return JSON.parse(result);
    }
  };

  // Multi-tool workflow evaluation
  const tradingWorkflowEval = {
    name: 'Trading Workflow Evaluation',
    description: 'Evaluates the system\'s ability to handle a complete trading workflow',
    run: async () => {
      const result = await grade(openai("gpt-4"), "Check my portfolio value, get a quote for trading 0.01 WETH to USDC, and then execute that trade if the quote looks reasonable.");
      return JSON.parse(result);
    }
  };

  // Collect all evals
  const evals = [
    getBalancesEval,
    getPortfolioEval,
    getTradesEval,
    getPriceEval,
    getTokenInfoEval,
    getPriceHistoryEval,
    executeTradeEval,
    getQuoteEval,
    solanaTokenEval,
    getCompetitionStatusEval,
    getLeaderboardEval,
    tradingWorkflowEval
  ];

  // Export configuration
  const config = {
    model: openai("gpt-4"),
    evals: evals
  };

  return { default: config, evals };
};

// Export the module
export default (await setupModule()).default;
export const evals = (await setupModule()).evals;