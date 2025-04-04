// Blockchain types
export var BlockchainType;
(function (BlockchainType) {
    BlockchainType["SVM"] = "svm";
    BlockchainType["EVM"] = "evm"; // Ethereum Virtual Machine
})(BlockchainType || (BlockchainType = {}));
// Specific EVM chains
export var SpecificChain;
(function (SpecificChain) {
    SpecificChain["ETH"] = "eth";
    SpecificChain["POLYGON"] = "polygon";
    SpecificChain["BSC"] = "bsc";
    SpecificChain["ARBITRUM"] = "arbitrum";
    SpecificChain["BASE"] = "base";
    SpecificChain["OPTIMISM"] = "optimism";
    SpecificChain["AVALANCHE"] = "avalanche";
    SpecificChain["LINEA"] = "linea";
    SpecificChain["SVM"] = "svm";
})(SpecificChain || (SpecificChain = {}));
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
