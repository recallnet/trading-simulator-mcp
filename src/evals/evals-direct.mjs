#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as dotenv from 'dotenv';
import { openai } from '@ai-sdk/openai';
import { grade } from 'mcp-evals';

// Load environment variables
dotenv.config();

// Ensure OPENAI_API_KEY is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set');
  console.error('Please set it in your .env file or environment');
  process.exit(1);
}

// Get directory information
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Server path is the compiled index.js file
const serverPath = resolve(__dirname, '../../dist/index.js');

// Definitions for all evaluations
const evaluations = [
  {
    name: 'Get Balances Evaluation',
    description: 'Evaluates the accuracy and completeness of token balance retrieval',
    query: "What are the current token balances in my portfolio?"
  },
  {
    name: 'Get Portfolio Evaluation',
    description: 'Evaluates the accuracy and completeness of portfolio information retrieval',
    query: "Show me my portfolio information including token valuations and total value."
  },
  {
    name: 'Get Trades Evaluation',
    description: 'Evaluates the accuracy and completeness of trade history retrieval',
    query: "Show me my recent 5 trades. Filter for just the EVM blockchain if possible."
  },
  {
    name: 'Get Price Evaluation',
    description: 'Evaluates the accuracy of token price retrieval',
    query: "What is the current price of WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) on Ethereum?"
  },
  {
    name: 'Get Token Info Evaluation',
    description: 'Evaluates the accuracy and completeness of token information retrieval',
    query: "Get me detailed information about USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) including its name, symbol, and decimals."
  },
  {
    name: 'Get Price History Evaluation',
    description: 'Evaluates the accuracy and completeness of historical price data retrieval',
    query: "Show me the price history of WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) for the last 24 hours with 1-hour intervals."
  },
  {
    name: 'Execute Trade Evaluation',
    description: 'Evaluates the functionality and correctness of executing trades between tokens',
    query: "Execute a trade of 0.01 WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) to USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) with a 0.5% slippage tolerance."
  },
  {
    name: 'Get Quote Evaluation',
    description: 'Evaluates the accuracy and completeness of trade quote retrieval',
    query: "Get me a quote for trading 0.05 WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) to USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)."
  },
  {
    name: 'Solana Token Evaluation',
    description: 'Evaluates the functionality of the system with Solana tokens',
    query: "What is the current price of SOL (So11111111111111111111111111111111111111112) on the Solana blockchain?"
  },
  {
    name: 'Get Competition Status Evaluation',
    description: 'Evaluates the accuracy and completeness of competition status information',
    query: "What is the current status of the trading competition? When did it start and when will it end?"
  },
  {
    name: 'Get Leaderboard Evaluation',
    description: 'Evaluates the accuracy and completeness of competition leaderboard information',
    query: "Show me the current trading competition leaderboard. Who's in the top positions and what are their portfolio values?"
  },
  {
    name: 'Trading Workflow Evaluation',
    description: 'Evaluates the system\'s ability to handle a complete trading workflow',
    query: "Check my portfolio value, get a quote for trading 0.01 WETH to USDC, and then execute that trade if the quote looks reasonable."
  }
];

// Directly run evaluations
async function runEvaluations() {
  console.log(`\n📊 Running evaluations with server: ${serverPath}\n`);

  // Save command line arguments
  const originalArgv = process.argv;

  // Add serverPath to process.argv[3] to make grade() work
  process.argv[3] = serverPath;

  // Track results
  const results = [];

  // Run each evaluation
  for (const evalFunc of evaluations) {
    console.log(`\n🔍 Running evaluation: ${evalFunc.name}`);
    console.log(`Description: ${evalFunc.description}`);

    try {
      // Call the grade function with proper server path in argv
      const result = await grade(openai("gpt-4"), evalFunc.query);
      const parsedResult = JSON.parse(result);

      results.push({
        name: evalFunc.name,
        result: parsedResult
      });

      console.log('✅ Results:');
      console.log(`   Accuracy: ${parsedResult.accuracy}/5`);
      console.log(`   Completeness: ${parsedResult.completeness}/5`);
      console.log(`   Relevance: ${parsedResult.relevance}/5`);
      console.log(`   Clarity: ${parsedResult.clarity}/5`);
      console.log(`   Reasoning: ${parsedResult.reasoning}/5`);
      console.log(`   Comments: ${parsedResult.overall_comments}`);
    } catch (error) {
      console.error(`❌ Error running evaluation: ${evalFunc.name}`);
      console.error(error);
      results.push({
        name: evalFunc.name,
        error: error.message || String(error)
      });
    }
  }

  // Calculate average scores
  const successfulResults = results.filter(r => r.result);
  if (successfulResults.length > 0) {
    const averages = successfulResults.reduce(
      (acc, { result }) => {
        acc.accuracy += result.accuracy;
        acc.completeness += result.completeness;
        acc.relevance += result.relevance;
        acc.clarity += result.clarity;
        acc.reasoning += result.reasoning;
        return acc;
      },
      { accuracy: 0, completeness: 0, relevance: 0, clarity: 0, reasoning: 0 }
    );

    const count = successfulResults.length;

    console.log('\n📈 Overall Results:');
    console.log(`   Average Accuracy: ${(averages.accuracy / count).toFixed(2)}/5`);
    console.log(`   Average Completeness: ${(averages.completeness / count).toFixed(2)}/5`);
    console.log(`   Average Relevance: ${(averages.relevance / count).toFixed(2)}/5`);
    console.log(`   Average Clarity: ${(averages.clarity / count).toFixed(2)}/5`);
    console.log(`   Average Reasoning: ${(averages.reasoning / count).toFixed(2)}/5`);
  }

  // Restore original argv
  process.argv = originalArgv;

  return results;
}

// Main execution
try {
  await runEvaluations();
  console.log('\nEvaluations completed successfully!');
} catch (error) {
  console.error('Error running evaluations:', error);
  process.exit(1);
}