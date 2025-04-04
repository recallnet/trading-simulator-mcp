/**
 * E2E-style authentication test script for the Trading Simulator API
 *
 * This script mimics exactly how the e2e tests authenticate requests,
 * which are known to be working correctly.
 */
import * as crypto from 'crypto';
import { config } from 'dotenv';
import axios from 'axios';
// Load environment variables
config();
// API credentials from environment
const apiKey = process.env.TRADING_SIM_API_KEY || '';
const apiSecret = process.env.TRADING_SIM_API_SECRET || '';
const baseUrl = process.env.TRADING_SIM_API_URL || 'http://localhost:3000';
class ApiClientE2EStyle {
    apiKey;
    apiSecret;
    baseUrl;
    constructor(apiKey, apiSecret, baseUrl = 'http://localhost:3000') {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = baseUrl;
    }
    /**
     * Calculate HMAC signature just like the e2e tests do
     */
    calculateSignature(payload) {
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(payload)
            .digest('hex');
    }
    /**
     * Get account balances
     */
    async getBalance() {
        try {
            const method = 'GET';
            const path = '/api/account/balances';
            // Use timestamp 2 years in the future for testing (exactly like e2e tests)
            const timestamp = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
            const body = '{}';
            // Construct the payload exactly like e2e tests
            const payload = method + path + timestamp + body;
            console.log('Generating signature with:');
            console.log(`Method: ${method}`);
            console.log(`Path: ${path}`);
            console.log(`Timestamp: ${timestamp}`);
            console.log(`Body: ${body}`);
            console.log(`Payload string: ${payload}`);
            const signature = this.calculateSignature(payload);
            console.log(`Generated signature: ${signature}`);
            // Send the request with axios just like e2e tests
            const url = `${this.baseUrl}${path}`;
            console.log(`Making request to: ${url}`);
            const response = await axios.get(url, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'X-Timestamp': timestamp,
                    'X-Signature': signature,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Response:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Error getting balances:');
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
                console.error('Response headers:', error.response.headers);
            }
            else if (error.request) {
                // The request was made but no response was received
                console.error('No response received:', error.request);
            }
            else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error message:', error.message);
            }
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
}
async function testE2EStyle() {
    console.log('==========================================');
    console.log('E2E-STYLE AUTHENTICATION TEST');
    console.log('==========================================');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`API Key: ${apiKey}`);
    console.log(`API Secret (first 4 chars): ${apiSecret.substring(0, 4)}...`);
    console.log('------------------------------------------');
    // Create a client that mimics e2e tests
    const client = new ApiClientE2EStyle(apiKey, apiSecret, baseUrl);
    // Try to get balances
    console.log('\nTesting balance API with e2e-style authentication:');
    try {
        const result = await client.getBalance();
        if (result.success) {
            console.log('\n✅ SUCCESS: Authentication worked!');
            console.log('Balances:', result.balances);
        }
        else {
            console.log('\n❌ FAILED: Authentication still not working');
            console.log('Error:', result.error);
        }
    }
    catch (error) {
        console.error('\n❌ FAILED: Error running test:', error);
    }
    console.log('\n==========================================');
    console.log('TEST COMPLETE');
    console.log('==========================================');
}
// Run the tests
testE2EStyle().catch(err => console.error("Test failed with error:", err));
