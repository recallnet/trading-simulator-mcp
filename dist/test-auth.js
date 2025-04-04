/**
 * Simple authentication test script for the Trading Simulator API
 *
 * This script tests authentication with the Trading Simulator server
 * independently of the MCP integration. It can help diagnose issues
 * with API keys, signatures, etc.
 */
import * as crypto from 'crypto';
import { config } from 'dotenv';
// Load environment variables
config();
// API credentials from environment
const apiKey = process.env.TRADING_SIM_API_KEY || '';
const apiSecret = process.env.TRADING_SIM_API_SECRET || '';
const baseUrl = process.env.TRADING_SIM_API_URL || 'http://localhost:3000';
async function testAuth() {
    console.log('==========================================');
    console.log('TRADING SIMULATOR API AUTHENTICATION TEST');
    console.log('==========================================');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`API Key: ${apiKey}`);
    console.log(`API Secret (first 4 chars): ${apiSecret.substring(0, 4)}...`);
    console.log('------------------------------------------');
    // Test 1: Basic connectivity (no auth required)
    console.log('\nTEST 1: Basic connectivity to health endpoint');
    try {
        const healthUrl = `${baseUrl}/api/health`;
        console.log(`GET ${healthUrl}`);
        const healthResponse = await fetch(healthUrl);
        const healthText = await healthResponse.text();
        console.log(`Response (${healthResponse.status}): ${healthText}`);
        console.log('TEST 1 RESULT: ' + (healthResponse.ok ? 'PASSED' : 'FAILED'));
    }
    catch (error) {
        console.log(`TEST 1 RESULT: FAILED - ${error}`);
        console.log('Cannot connect to the API server. Please check that it is running.');
        return;
    }
    // Test 2: Price API (no auth required)
    console.log('\nTEST 2: Price API (no auth required)');
    try {
        const solAddress = 'So11111111111111111111111111111111111111112';
        const priceUrl = `${baseUrl}/api/price?token=${solAddress}`;
        console.log(`GET ${priceUrl}`);
        const priceResponse = await fetch(priceUrl);
        const priceData = await priceResponse.json();
        console.log(`Response (${priceResponse.status}):`, priceData);
        console.log('TEST 2 RESULT: ' + (priceResponse.ok ? 'PASSED' : 'FAILED'));
    }
    catch (error) {
        console.log(`TEST 2 RESULT: FAILED - ${error}`);
    }
    // Test 3: Authenticated request with current timestamp
    console.log('\nTEST 3: Authenticated request with current timestamp');
    await testAuthenticatedRequest(false);
    // Test 4: Authenticated request with future timestamp
    console.log('\nTEST 4: Authenticated request with future timestamp');
    await testAuthenticatedRequest(true);
    console.log('\n==========================================');
    console.log('AUTHENTICATION TEST COMPLETE');
    console.log('==========================================');
}
async function testAuthenticatedRequest(useFutureTimestamp) {
    try {
        // Create request details
        const method = 'GET';
        const path = '/api/account/balances';
        let timestamp;
        if (useFutureTimestamp) {
            // Use timestamp 2 years in the future for tests
            timestamp = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
        }
        else {
            // Use current timestamp
            timestamp = new Date().toISOString();
        }
        const body = '{}';
        // Path with query params removed for signature
        const pathForSignature = path.split('?')[0];
        // Create signature
        const data = method + pathForSignature + timestamp + body;
        const signature = crypto
            .createHmac('sha256', apiSecret)
            .update(data)
            .digest('hex');
        console.log('Request details:');
        console.log(`Method: ${method}`);
        console.log(`Path: ${path}`);
        console.log(`Path for signature: ${pathForSignature}`);
        console.log(`Timestamp: ${timestamp}`);
        console.log(`Body: ${body}`);
        console.log(`Data string: ${data}`);
        console.log(`Signature: ${signature}`);
        // Make request
        const headers = {
            'X-API-Key': apiKey,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
            'Content-Type': 'application/json',
            'User-Agent': 'AuthTest/1.0'
        };
        const url = `${baseUrl}${path}`;
        console.log(`Making request to ${url}`);
        const response = await fetch(url, {
            method,
            headers
        });
        let responseData;
        try {
            const text = await response.text();
            try {
                responseData = JSON.parse(text);
            }
            catch (e) {
                responseData = text;
            }
        }
        catch (e) {
            responseData = 'Failed to read response';
        }
        console.log(`Response (${response.status}):`, responseData);
        console.log(`TEST RESULT: ${response.ok ? 'PASSED' : 'FAILED'}`);
        if (!response.ok) {
            console.log('Authentication failed. Please check:');
            console.log('1. API key and secret are correct');
            console.log('2. Server logs for more details');
            console.log('3. Path format - make sure it includes /api prefix');
            console.log('4. Time synchronization between client and server');
        }
        return response.ok;
    }
    catch (error) {
        console.log(`Request error: ${error}`);
        console.log('TEST RESULT: FAILED');
        return false;
    }
}
// Run the tests
testAuth().catch(err => console.error("Test failed with error:", err));
