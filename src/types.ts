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
  teamId: string;
  balances: Array<{
    token: string;
    amount: number;
    chain: BlockchainType;
    specificChain: string | null;
  }>;
}

export interface PortfolioResponse extends ApiResponse {
  teamId: string;
  totalValue: number;
  tokens: Array<{
    token: string;
    amount: number;
    price: number;
    value: number;
    chain: BlockchainType;
    specificChain: string | null;
  }>;
  snapshotTime: string;
  source: 'snapshot' | 'live-calculation';
}

export interface TradeResponse {
  id: string;
  teamId: string;
  competitionId: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  price: number;
  success: boolean;
  error: string | null;
  timestamp: string;
  fromChain: BlockchainType;
  toChain: BlockchainType;
  fromSpecificChain: string | null;
  toSpecificChain: string | null;
}

export interface TradesResponse extends ApiResponse {
  teamId: string;
  trades: TradeResponse[];
}

export interface PriceResponse extends ApiResponse {
  price: number | null;
  token: string;
  chain: BlockchainType;
  specificChain: string | null;
}

export interface TokenInfoResponse extends ApiResponse {
  price: number | null;
  token: string;
  chain: BlockchainType;
  specificChain: string | null;
  name?: string;
  symbol?: string;
  decimals?: number;
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
    teamId: string;
    competitionId: string;
    fromToken: string;
    toToken: string;
    fromAmount: number;
    toAmount: number;
    price: number;
    success: boolean;
    timestamp: string;
    fromChain: BlockchainType;
    toChain: BlockchainType;
    fromSpecificChain: string | null;
    toSpecificChain: string | null;
  };
}

export interface QuoteResponse extends ApiResponse {
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  slippage: number;
  prices: {
    fromToken: number;
    toToken: number;
  };
  chains: {
    fromChain: BlockchainType;
    toChain: BlockchainType;
  };
}

export interface CompetitionStatusResponse extends ApiResponse {
  active: boolean;
  competition: {
    id: string;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  message?: string;
}

export interface LeaderboardResponse extends ApiResponse {
  competition: {
    id: string;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  leaderboard: Array<{
    rank: number;
    teamId: string;
    teamName: string;
    portfolioValue: number;
  }>;
}

export interface CompetitionRulesResponse extends ApiResponse {
  rules: {
    tradingRules: string[];
    supportedChains: string[];
    rateLimits: string[] | {
      tradeRequestsPerMinute: number;
      priceRequestsPerMinute: number;
      accountRequestsPerMinute: number;
      totalRequestsPerMinute: number;
      totalRequestsPerHour: number;
    };
    slippageFormula: string;
  };
} 