/**
 * API Key Check Script
 *
 * This script tests whether the API key is recognized by the server.
 * It makes requests with different timestamps to see which one works.
 */
import axios from 'axios';
import * as crypto from 'crypto';
import { config } from 'dotenv';
// Load environment variables
config();
// API credentials from environment
const apiKey = process.env.TRADING_SIM_API_KEY || '';
const apiSecret = process.env.TRADING_SIM_API_SECRET || '';
const baseUrl = process.env.TRADING_SIM_API_URL || 'http://localhost:3000';
// Test the API key with different timestamp options
async function testApiKey() {
    console.log('===============================================');
    console.log('API KEY RECOGNITION TEST');
    console.log('===============================================');
    console.log(`Testing API Key: ${apiKey}`);
    console.log(`API Secret (first 4 chars): ${apiSecret.substring(0, 4)}...`);
    console.log(`Base URL: ${baseUrl}`);
    console.log('-----------------------------------------------');
    // First let's test if the health endpoint is accessible
    try {
        const healthResponse = await axios.get(`${baseUrl}/api/health`);
        console.log('✅ Health endpoint accessible:', healthResponse.data);
    }
    catch (error) {
        console.error('❌ Health endpoint not accessible:', error);
        return;
    }
    // Test 1: Try creating a new team to see if we can access the server in any way
    console.log('\nTEST 1: Try requesting price data (no auth needed)');
    try {
        const priceResponse = await axios.get(`${baseUrl}/api/price?token=So11111111111111111111111111111111111111112`);
        console.log('✅ Price check successful:', priceResponse.data);
    }
    catch (error) {
        const axiosError = error;
        console.error('❌ Price check failed:', axiosError.response?.data || axiosError.message);
    }
    // Test 2: Check using your apiKey but without signing (to see if the key is recognized at all)
    console.log('\nTEST 2: Check if the API key is recognized (without signature)');
    try {
        const response = await axios.get(`${baseUrl}/api/account/balances`, {
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Response (unexpected success):', response.data);
    }
    catch (error) {
        // We expect this to fail, but with a specific error about missing timestamp/signature
        // not about invalid API key
        const axiosError = error;
        const errorMessage = axiosError.response?.data?.error || axiosError.message;
        console.log(`Response: ${axiosError.response?.status} - ${errorMessage}`);
        if (errorMessage.includes('timestamp') || errorMessage.includes('signature')) {
            console.log('✅ API key recognized, but signature/timestamp missing as expected');
        }
        else if (errorMessage.includes('Invalid API credentials') || errorMessage.includes('API key')) {
            console.log('❌ API key not recognized by the server');
        }
        else {
            console.log('❓ Unexpected error');
        }
    }
    // Test 3: Try with different timestamp formats
    console.log('\nTEST 3: Try with different timestamp formats');
    // Current timestamp
    const currentTimestamp = new Date().toISOString();
    await testWithTimestamp('Current timestamp', currentTimestamp);
    // Future timestamp (2 years ahead, exactly like e2e tests)
    const futureTimestamp = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    await testWithTimestamp('Future timestamp (2 years ahead)', futureTimestamp);
    // Numeric timestamp
    const numericTimestamp = Date.now().toString();
    await testWithTimestamp('Numeric timestamp', numericTimestamp);
    console.log('\n===============================================');
    console.log('TEST COMPLETE');
    console.log('===============================================');
    console.log('\nRECOMMENDATIONS:');
    console.log('1. Check if this API key exists in the database');
    console.log('2. Register a new team and get a fresh API key/secret');
    console.log('3. Add debug logging to your server auth middleware');
    console.log('4. Check if your e2e tests use the same key format');
}
async function testWithTimestamp(label, timestamp) {
    console.log(`\nTesting with ${label}: ${timestamp}`);
    try {
        // Create the signature
        const method = 'GET';
        const path = '/api/account/balances';
        const body = '{}';
        const payload = method + path + timestamp + body;
        const signature = crypto
            .createHmac('sha256', apiSecret)
            .update(payload)
            .digest('hex');
        console.log(`Generated signature: ${signature}`);
        // Make the request
        const response = await axios.get(`${baseUrl}${path}`, {
            headers: {
                'X-API-Key': apiKey,
                'X-Timestamp': timestamp,
                'X-Signature': signature,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Authentication SUCCESSFUL:', response.data);
        return true;
    }
    catch (error) {
        const axiosError = error;
        const errorMessage = axiosError.response?.data?.error || axiosError.message;
        console.log(`❌ Authentication failed: ${axiosError.response?.status} - ${errorMessage}`);
        return false;
    }
}
// Run the test
testApiKey().catch(err => console.error('Test failed with error:', err));
