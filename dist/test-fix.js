import { TradingSimulatorClient } from './api-client.js';
import { ENV } from './env.js';
/**
 * Test script to verify the authentication fix
 *
 * This explicitly tests with the fixed paths to ensure authentication works
 */
async function testAuthenticationFix() {
    // Create a client with testMode=true to match the E2E tests
    const client = new TradingSimulatorClient(ENV.API_KEY, ENV.API_SECRET, ENV.API_URL, true // Use future timestamps (like E2E tests)
    );
    console.log('======= Authentication Fix Test =======');
    console.log(`Using API Key: ${ENV.API_KEY}`);
    console.log(`Base URL: ${ENV.API_URL}`);
    console.log('');
    try {
        // Debug the authentication calculations
        console.log('== Debugging Authentication Parameters ==');
        // This should use EXACTLY the same path format as the server
        client.debugAuthentication('GET', '/api/account/balances', null);
        // Now try to make an actual request
        console.log('\n== Testing Authentication with Request ==');
        console.log('Attempting to fetch balances...');
        const result = await client.getBalances();
        console.log('\n✅ SUCCESS! Authentication works correctly now');
        console.log('Response:', JSON.stringify(result, null, 2));
    }
    catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('Possible causes:');
        console.error('1. API key/secret may still be incorrect (try creating a new team)');
        console.error('2. Path format might still not match server expectations');
        console.error('3. Server environment variables or configuration issue');
        console.error('\nCheck server logs for more details on signature validation');
    }
    console.log('\n=====================================');
}
// Run the test
testAuthenticationFix().catch(err => console.error('Fatal error:', err));
