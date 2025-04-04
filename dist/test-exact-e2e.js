/**
 * Exact E2E ApiClient test
 *
 * This script uses the exact same ApiClient implementation from your e2e tests
 * to see if we can authenticate properly.
 */
import axios from 'axios';
import { createHmac } from 'crypto';
import { config } from 'dotenv';
// Load environment variables
config();
// API credentials from environment
const apiKey = process.env.TRADING_SIM_API_KEY || '';
const apiSecret = process.env.TRADING_SIM_API_SECRET || '';
const baseUrl = process.env.TRADING_SIM_API_URL || 'http://localhost:3000';
/**
 * API client for testing the Trading Simulator
 *
 * This client handles authentication, request signing, and convenience methods
 * for interacting with the API endpoints.
 */
export class ApiClient {
    axiosInstance;
    apiKey;
    apiSecret;
    jwtToken = null;
    baseUrl;
    /**
     * Create a new API client
     *
     * @param apiKey API key for authentication
     * @param apiSecret API secret for request signing
     * @param baseUrl Optional custom base URL
     */
    constructor(apiKey, apiSecret, baseUrl = 'http://localhost:3000') {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = baseUrl;
        // Create axios instance
        this.axiosInstance = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // Add interceptor to sign requests
        this.axiosInstance.interceptors.request.use((config) => {
            // Add common headers
            config.headers = config.headers || {};
            // For admin routes, use JWT authentication if available
            if (this.jwtToken && (config.url?.startsWith('/api/admin') || config.url?.includes('admin'))) {
                config.headers['Authorization'] = `Bearer ${this.jwtToken}`;
            }
            // For all routes, use HMAC authentication
            if (this.apiKey && this.apiSecret) {
                const timestamp = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 2 years in the future
                const method = config.method?.toUpperCase() || 'GET';
                const path = config.url || '';
                const body = config.data ? JSON.stringify(config.data) : '{}';
                const payload = method + path + timestamp + body;
                const signature = this.calculateSignature(payload);
                console.log(`[ApiClient] Request details:`);
                console.log(`[ApiClient] Method: ${method}`);
                console.log(`[ApiClient] Path: ${path}`);
                console.log(`[ApiClient] Timestamp: ${timestamp}`);
                console.log(`[ApiClient] Body: ${body}`);
                console.log(`[ApiClient] Payload: ${payload}`);
                console.log(`[ApiClient] API Key: ${this.apiKey}`);
                console.log(`[ApiClient] Secret Length: ${this.apiSecret?.length}`);
                console.log(`[ApiClient] Signature: ${signature}`);
                config.headers['X-API-Key'] = this.apiKey;
                config.headers['X-Timestamp'] = timestamp;
                config.headers['X-Signature'] = signature;
            }
            return config;
        });
        // Add interceptor to handle response
        this.axiosInstance.interceptors.response.use((response) => response, (error) => {
            // Let the error propagate for specific handling
            return Promise.reject(error);
        });
    }
    /**
     * Calculate HMAC signature
     */
    calculateSignature(payload) {
        if (!this.apiSecret) {
            throw new Error('API secret is required for signature calculation');
        }
        return createHmac('sha256', this.apiSecret)
            .update(payload)
            .digest('hex');
    }
    /**
     * Helper method to handle API errors consistently
     */
    handleApiError(error, operation) {
        console.error(`Failed to ${operation}:`, error);
        // Extract the detailed error message from the axios error response
        if (axios.isAxiosError(error) && error.response?.data) {
            // Return the actual error message from the server with correct status
            return {
                success: false,
                error: error.response.data.error || error.response.data.message || error.message,
                status: error.response.status
            };
        }
        // Fallback to the generic error message
        return { success: false, error: error.message, status: 500 };
    }
    /**
     * Get account balances
     */
    async getBalance() {
        try {
            const response = await this.axiosInstance.get('/api/account/balances');
            // Transform the balances array into an object with token addresses as keys
            if (response.data.success && Array.isArray(response.data.balances)) {
                const balanceObject = {};
                response.data.balances.forEach((balance) => {
                    // Store as numbers, not strings
                    balanceObject[balance.token] = parseFloat(balance.amount.toString());
                });
                return {
                    success: response.data.success,
                    teamId: response.data.teamId,
                    balance: balanceObject // Use 'balance' (singular) to match what the tests expect
                };
            }
            return response.data;
        }
        catch (error) {
            return this.handleApiError(error, 'get balances');
        }
    }
}
async function testExactE2EClient() {
    console.log('==========================================');
    console.log('EXACT E2E API CLIENT TEST');
    console.log('==========================================');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`API Key: ${apiKey}`);
    console.log(`API Secret (first 4 chars): ${apiSecret.substring(0, 4)}...`);
    console.log('------------------------------------------');
    // Create a client that mimics e2e tests exactly
    const client = new ApiClient(apiKey, apiSecret, baseUrl);
    // Try to get balances
    console.log('\nTesting balance API with exact e2e implementation:');
    try {
        const result = await client.getBalance();
        if (result.success) {
            console.log('\n✅ SUCCESS: Authentication worked!');
            console.log('Balances:', result.balance);
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
testExactE2EClient().catch(err => console.error("Test failed with error:", err));
