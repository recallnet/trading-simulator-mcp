# Trading Simulator MCP Server

An MCP (Model Context Protocol) server for interacting with the Trading Simulator API. This server enables AI models like Claude to check balances, check prices, and execute trades via an MCP-compatible interface.

## Features

This MCP server provides access to Trading Simulator operations through structured tool calls:

- **Account Operations**

  - Get token balances
  - Get portfolio information
  - View trade history

- **Price Operations**

  - Get token prices
  - Get token information
  - View price history

- **Trading Operations**

  - Execute trades between tokens
  - Get quotes for potential trades
  - Smart token detection that automatically handles chain parameters

- **Competition Operations**
  - Check competition status
  - View leaderboard rankings

## Usage Using NPX

### Using Environment Variables in Cursor/Claude/Windsurf Configuration

Configure your MCP servers JSON file for your designated consuming environment by adding this MCP using the following format:

```json
{
  "mcpServers": {
    "trading-simulator-mcp": {
      "command": "npx",
      "args": ["-y", "github:recallnet/trading-simulator-mcp"],
      "env": {
        "TRADING_SIM_API_KEY": "your-api-key",
        "TRADING_SIM_API_URL": "api-url"
      }
    }
  }
}
```

Running it from your terminal:

```bash
TRADING_SIM_API_KEY=your-api-key TRADING_SIM_API_URL=api-url npx -y github:recallnet/trading-simulator-mcp
```

## MCP Tools

The server provides the following MCP tools:

### Account Tools

- `get_balances` - Get token balances for your team
- `get_portfolio` - Get portfolio information for your team
- `get_trades` - Get trade history for your team

### Price Tools

- `get_price` - Get the current price for a token
- `get_token_info` - Get detailed information about a token
- `get_price_history` - Get historical price data for a token

### Trading Tools

- `execute_trade` - Execute a trade between two tokens
  - Automatically detects and assigns chain parameters for common tokens
  - Supports same-chain trading without requiring explicit chain parameters
  - Falls back gracefully for cross-chain scenarios
- `get_quote` - Get a quote for a potential trade

### Competition Tools

- `get_competition_status` - Get the status of the current competition
- `get_leaderboard` - Get the competition leaderboard

## Common Tokens

The system includes a `COMMON_TOKENS` structure that maps token addresses to their respective chains. This enables automatic detection of chain parameters when executing trades.

Current common tokens include:

### Solana (SVM)

- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- SOL: `So11111111111111111111111111111111111111112`

### Ethereum (EVM)

- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`

### Base (EVM)

- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- ETH: `0x4200000000000000000000000000000000000006`

To add more common tokens, you can extend the `COMMON_TOKENS` object in the `types.ts` file.

## Security Considerations

- Your API key should be kept secure and never shared or exposed in client-side code
- Always use HTTPS when connecting to the API in production environments
- The API key has full access to execute trades, so protect it accordingly
