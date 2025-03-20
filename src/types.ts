// Blockchain types
export enum BlockchainType {
  SVM = 'svm', // Solana Virtual Machine
  EVM = 'evm'  // Ethereum Virtual Machine
}

// Specific EVM chains
export enum SpecificChain {
  ETH = 'eth',
  POLYGON = 'polygon',
  BSC = 'bsc',
  ARBITRUM = 'arbitrum',
  BASE = 'base',
  OPTIMISM = 'optimism', 
  AVALANCHE = 'avalanche',
  LINEA = 'linea',
  SVM = 'svm'
}

// Common token addresses
export const COMMON_TOKENS = {
  // Solana tokens
  SVM: {
    SVM: {
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      SOL: 'So11111111111111111111111111111111111111112'
    }
  },
  // Ethereum tokens
  EVM: {
    ETH: {
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    },
    BASE: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      ETH: '0x4200000000000000000000000000000000000006'
    }
  }
};

// Trade Parameters
export interface TradeParams {
  fromToken: string;
  toToken: string;
  amount: string;
  price?: string;
  slippageTolerance?: string;
  fromChain?: BlockchainType;
  toChain?: BlockchainType;
  fromSpecificChain?: SpecificChain;
  toSpecificChain?: SpecificChain;
}

// Trade History Query Parameters
export interface TradeHistoryParams {
  limit?: number;
  offset?: number;
  token?: string;
  chain?: BlockchainType;
}

// Price History Parameters
export interface PriceHistoryParams {
  token: string;
  startTime?: string;
  endTime?: string;
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  chain?: BlockchainType;
  specificChain?: SpecificChain;
}

// API Response Types
export interface ApiResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export interface BalancesResponse extends ApiResponse {
  balances: Array<{
    token: string;
    amount: string;
    chain: BlockchainType;
  }>;
}

export interface PortfolioResponse extends ApiResponse {
  portfolio: {
    totalValueUSD: string;
    positions: Array<{
      token: string;
      amount: string;
      valueUSD: string;
      percentage: string;
      chain: BlockchainType;
    }>;
  };
}

export interface TradesResponse extends ApiResponse {
  trades: Array<{
    id: string;
    fromToken: string;
    fromChain: BlockchainType;
    toToken: string;
    toChain: BlockchainType;
    fromAmount: string;
    toAmount: string;
    priceAtExecution: string;
    timestamp: string;
    slippage: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface PriceResponse extends ApiResponse {
  price: number;
  token: string;
  chain: BlockchainType;
  specificChain?: SpecificChain;
}

export interface TokenInfoResponse extends ApiResponse {
  price: number;
  token: string;
  chain: BlockchainType;
  specificChain: SpecificChain;
}

export interface PriceHistoryResponse extends ApiResponse {
  priceHistory: Array<{
    token: string;
    usdPrice: number;
    timestamp: string;
    chain: BlockchainType;
  }>;
}

export interface TradeExecutionResponse extends ApiResponse {
  transaction: {
    id: string;
    timestamp: string;
    fromToken: string;
    fromChain: BlockchainType;
    toToken: string;
    toChain: BlockchainType;
    fromAmount: string;
    toAmount: string;
    price: string;
    success: boolean;
    teamId: string;
    competitionId: string;
  };
}

export interface QuoteResponse extends ApiResponse {
  quote: {
    fromToken: string;
    fromChain: BlockchainType;
    toToken: string;
    toChain: BlockchainType;
    fromAmount: string;
    estimatedToAmount: string;
    estimatedPriceImpact: string;
    timestamp: string;
  };
}

export interface CompetitionStatusResponse extends ApiResponse {
  competition: {
    id: string;
    name: string;
    status: string;
    startTime: string;
    endTime: string;
    timeRemaining: string;
  };
}

export interface LeaderboardResponse extends ApiResponse {
  competition: {
    id: string;
    name: string;
  };
  leaderboard: Array<{
    rank: number;
    teamName: string;
    portfolioValue: string;
    percentageGain: string;
  }>;
}

export interface CompetitionRulesResponse extends ApiResponse {
  rules: {
    tradingRules: string[];
    supportedChains: string[];
    rateLimits: {
      tradeRequestsPerMinute: number;
      priceRequestsPerMinute: number;
      accountRequestsPerMinute: number;
      totalRequestsPerMinute: number;
      totalRequestsPerHour: number;
    };
    slippageFormula: string;
  };
} 