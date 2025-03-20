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

## Smart Token Handling

The Trading Simulator MCP includes an intelligent token detection system that simplifies trade execution:

- **Automatic Chain Detection**: When executing trades with common tokens, the system automatically identifies the appropriate blockchain (EVM/SVM) and specific chain (ETH, BASE, etc.) parameters.

- **Same-Chain Optimization**: When trading tokens on the same chain, parameters are automatically configured for same-chain transactions.

- **Cross-Chain Fallback**: If a same-chain trade fails due to tokens being on different chains, the system falls back gracefully to explicit parameters or server-side detection.

- **Common Token Support**: The system includes a growing list of common tokens with their addresses and chain information.

## Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/trading-simulator-mcp.git
   cd trading-simulator-mcp
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure your API credentials (see Configuration section below)

4. Build the project
   ```bash
   npm run build
   ```

5. Start the server
   ```bash
   npm run start
   ```

## Configuration

You have two options for configuring the Trading Simulator MCP server:

### Method 1: Direct Configuration in Cursor/Claude (Recommended)

The recommended approach is to provide environment variables directly in your Cursor or Claude Desktop configuration. This is more secure and eliminates the need for a .env file.

- The server will automatically use these environment variables when provided through the configuration.
- See the "Adding to Cursor" and "Adding to Claude Desktop" sections below for specific setup instructions.

### Method 2: Using a .env File (Fallback)

If you prefer to use a .env file, or are running the server directly from the command line:

1. Create a `.env` file with your API credentials
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your API key and secret
   ```
   TRADING_SIM_API_KEY=your_api_key_here
   TRADING_SIM_API_SECRET=your_api_secret_here
   TRADING_SIM_API_URL=http://localhost:3000
   DEBUG=false
   ```

3. Secure your .env file with restricted permissions
   ```bash
   chmod 600 .env
   ```

## Environment Variable Precedence

The Trading Simulator MCP server uses the following order of precedence for environment variables:

1. Environment variables provided directly from JSON configuration
2. Environment variables from a .env file (if present and #1 is not available)
3. Default values for optional variables (e.g., API_URL defaults to "http://localhost:3000")

## Adding to Cursor

To add this MCP server to Cursor:

1. Build the project first with `npm run build`
2. In Cursor, go to Settings > MCP Servers
3. Click "Add Server"
4. Configure the server with the following settings:
   - **Name**: `Trading Simulator MCP` (or any name you prefer)
   - **Type**: `command`
   - **Command**: `node`
   - **Arguments**: `/path/to/trading-sim-mcp/dist/index.js` (use the full path)
   - **Environment Variables**:
     - `TRADING_SIM_API_KEY`: Your API key
     - `TRADING_SIM_API_SECRET`: Your API secret
     - `TRADING_SIM_API_URL`: API server URL (optional)
     - `DEBUG`: `true` (optional, for additional logging)
5. Click "Save"

### Using Environment Variables in Cursor Configuration

For more security, you can configure Cursor via the `.cursor/mcp.json` file in your home directory:

```json
{
  "mcpServers": {
    "trading-simulator-mcp": {
      "name": "Trading Simulator MCP",
      "type": "command",
      "command": "node",
      "args": ["/path/to/trading-simulator-mcp/dist/index.js"],
      "env": {
        "TRADING_SIM_API_KEY": "your_api_key_here",
        "TRADING_SIM_API_SECRET": "your_api_secret_here",
        "TRADING_SIM_API_URL": "http://localhost:3000",
        "DEBUG": "true"
      }
    }
  }
}
```

This approach eliminates the need for a .env file.

## Adding to Claude Desktop

To add this MCP server to Claude Desktop:

1. Build the project first with `npm run build`
2. Locate your Claude Desktop configuration file at:
   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - On Linux: `~/.config/Claude/claude_desktop_config.json`

3. Create or edit the `claude_desktop_config.json` file with the following content:
   ```json
   {
     "mcpServers": {
       "trading-simulator-mcp": {
         "name": "Trading Simulator MCP",
         "type": "command",
         "command": "node",
         "args": [
           "/path/to/trading-simulator-mcp/dist/index.js"
         ],
         "env": {
           "TRADING_SIM_API_KEY": "your_api_key_here",
           "TRADING_SIM_API_SECRET": "your_api_secret_here",
           "TRADING_SIM_API_URL": "http://localhost:3000",
           "DEBUG": "true"
         }
       }
     }
   }
   ```

4. Replace `/path/to/trading-simulator-mcp/dist/index.js` with the full path to your compiled server file
   - Example: `/Users/username/trading-simulator-mcp/dist/index.js`

5. Save the configuration file and restart Claude Desktop

If you encounter issues with Claude Desktop, check the logs at:
- On macOS: `~/Library/Logs/Claude/`
- On Windows: `%USERPROFILE%\AppData\Local\Claude\Logs\`
- On Linux: `~/.local/share/Claude/logs/`

## Important Development Note

When developing the MCP server, use `console.error()` instead of `console.log()` for all debugging and logging. The Claude Desktop app and Cursor communicate with the server via stdout, so any `console.log()` statements will interfere with this communication and cause JSON parsing errors.

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

- Your API secret is used to sign requests but is never exposed in responses
- Always keep your API credentials secure
- The MCP server does not share your API secret with AI models
- If using a .env file, ensure it has restricted permissions (`chmod 600 .env`)
- Never share your API credentials or .env file contents