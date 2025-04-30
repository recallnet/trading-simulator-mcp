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

// Portfolio source
export enum PortfolioSource {
  SNAPSHOT = 'snapshot',
  LIVE_CALCULATION = 'live-calculation'
}

// Competition status
export enum CompetitionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
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

// Team metadata structure
export interface TeamMetadata {
  ref?: {
    name?: string;
    version?: string;
    url?: string;
  };
  description?: string;
  social?: {
    name?: string;
    email?: string;
    twitter?: string;
  };
}

// Trade Parameters
export interface TradeParams {
  fromToken: string;
  toToken: string;
  amount: string;
  reason: string;
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
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

// Error Response Type
export interface ErrorResponse {
  success: false;
  error: string;
  status: number;
}

// Team profile response
export interface TeamProfileResponse extends ApiResponse {
  team: {
    id: string;
    name: string;
    email: string;
    contactPerson: string;
    metadata?: TeamMetadata;
    createdAt: string;
    updatedAt: string;
  };
}

// Token balance type
export interface TokenBalance {
  token: string;
  amount: number;
  chain: BlockchainType;
  specificChain: SpecificChain | null;
}

export interface BalancesResponse extends ApiResponse {
  teamId: string;
  balances: TokenBalance[];
}

// Token portfolio item
export interface TokenPortfolioItem {
  token: string;
  amount: number;
  price: number;
  value: number;
  chain: BlockchainType;
  specificChain: SpecificChain | null;
}

export interface PortfolioResponse extends ApiResponse {
  teamId: string;
  totalValue: number;
  tokens: TokenPortfolioItem[];
  snapshotTime: string;
  source: PortfolioSource;
}

export interface TradeTransaction {
  id: string;
  teamId: string;
  competitionId: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  price: number;
  success: boolean;
  error?: string;
  reason: string;
  timestamp: string;
  fromChain: string;
  toChain: string;
  fromSpecificChain: string | null;
  toSpecificChain: string | null;
}

// Standardize on TradeHistoryResponse for consistency with api-types.ts
export interface TradeHistoryResponse extends ApiResponse {
  teamId: string;
  trades: TradeTransaction[];
}

// Standardize on TradeResponse for consistency with api-types.ts
export interface TradeResponse extends ApiResponse {
  transaction: TradeTransaction;
}

export interface PriceResponse extends ApiResponse {
  price: number | null;
  token: string;
  chain: BlockchainType;
  specificChain: string | null;
  timestamp?: string;
}

export interface TokenInfoResponse extends ApiResponse {
  token: string;
  chain: BlockchainType;
  specificChain: SpecificChain | null;
  name?: string;
  symbol?: string;
  decimals?: number;
  logoURI?: string;
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
}

// Price history point
export interface PriceHistoryPoint {
  timestamp: string;
  price: number;
}

export interface PriceHistoryResponse extends ApiResponse {
  token: string;
  chain: BlockchainType;
  specificChain: SpecificChain | null;
  interval: string;
  history: PriceHistoryPoint[];
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
  fromSpecificChain?: string;
  toSpecificChain?: string;
}

// Competition details
export interface Competition {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: CompetitionStatus;
  allowCrossChainTrading: boolean;
  createdAt: string;
  updatedAt: string;
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  portfolioValue: number;
  active: boolean;
  deactivationReason?: string;
}

export interface CompetitionStatusResponse extends ApiResponse {
  active: boolean;
  competition: Competition | null;
  message?: string;
  participating?: boolean;
}

export interface LeaderboardResponse extends ApiResponse {
  competition: Competition;
  leaderboard: LeaderboardEntry[];
  hasInactiveTeams?: boolean;
}

export interface CompetitionRulesResponse extends ApiResponse {
  rules: {
    tradingRules: string[];
    rateLimits: string[];
    availableChains: {
      svm: boolean;
      evm: string[];
    };
    slippageFormula: string;
    portfolioSnapshots: {
      interval: string;
    };
  };
}

// Health check response
export interface HealthCheckResponse extends ApiResponse {
  status: "ok" | "error";
  version?: string;
  uptime?: number;
  timestamp: string;
  services?: {
    database?: {
      status: "ok" | "error";
      message?: string;
    };
    cache?: {
      status: "ok" | "error";
      message?: string;
    };
    priceProviders?: {
      status: "ok" | "error";
      providers?: {
        name: string;
        status: "ok" | "error";
        message?: string;
      }[];
    };
  };
}

// Detailed health check response
export interface DetailedHealthCheckResponse extends ApiResponse {
  status: "ok" | "error";
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    priceTracker: string;
    balanceManager: string;
    tradeSimulator: string;
    competitionManager: string;
    teamManager: string;
  };
}