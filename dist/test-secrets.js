import * as crypto from 'crypto';
import { ENV } from './env.js';
/**
 * This script tests multiple variations of the API secret to help
 * diagnose authentication issues with the Trading Simulator API.
 */
// Configuration
const API_KEY = ENV.API_KEY; // sk_6ab34fafed68720742eb1e7f445f0355
const API_SECRET = ENV.API_SECRET; // From .env file
const API_URL = ENV.API_URL;
// Test data for signature generation
const METHOD = 'GET';
const PATH = '/api/account/balances';
const TIMESTAMP = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 2 years in future
const BODY = '{}';
// Payloads to test (different path normalization strategies)
const payloads = [
    { name: 'Standard', data: METHOD + PATH + TIMESTAMP + BODY },
    { name: 'Without /api prefix', data: METHOD + PATH.replace('/api', '') + TIMESTAMP + BODY },
    { name: 'With extra /', data: METHOD + '/' + PATH + TIMESTAMP + BODY },
    { name: 'All lowercase', data: (METHOD + PATH + TIMESTAMP + BODY).toLowerCase() },
    { name: 'Without leading slash', data: METHOD + PATH.substring(1) + TIMESTAMP + BODY }
];
// Secret variations to try
const secretVariations = [
    { name: 'Original Secret', secret: API_SECRET },
    { name: 'Trimmed Secret', secret: API_SECRET.trim() },
    { name: 'Global HMAC Secret [try admin panel value]', secret: 'global_secret_replace_with_your_value' },
    { name: 'Secret with quotes removed', secret: API_SECRET.replace(/["']/g, '') },
    { name: 'First 32 chars of Secret', secret: API_SECRET.substring(0, 32) },
    { name: 'All lowercase Secret', secret: API_SECRET.toLowerCase() },
    { name: 'First 40 chars of Secret', secret: API_SECRET.substring(0, 40) }
];
// Function to calculate signature
function generateSignature(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}
// Function to make a test request to the API
async function testAuth(secret, payload) {
    try {
        const url = `${API_URL}${PATH}`;
        const signature = generateSignature(payload, secret);
        const response = await fetch(url, {
            method: METHOD,
            headers: {
                'X-API-Key': API_KEY,
                'X-Timestamp': TIMESTAMP,
                'X-Signature': signature,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.text();
        let message;
        try {
            const parsed = JSON.parse(data);
            message = parsed.error || parsed.message || data;
        }
        catch {
            message = data;
        }
        return { status: response.status, message };
    }
    catch (error) {
        return { status: 999, message: error.message || 'Network error' };
    }
}
async function main() {
    console.log('======= API SECRET VARIATION TESTING =======');
    console.log(`API Key: ${API_KEY}`);
    console.log(`API URL: ${API_URL}`);
    console.log(`Timestamp: ${TIMESTAMP}`);
    console.log('===========================================\n');
    // Test actual API request with most likely working combination
    console.log('Testing API with original setup first...');
    const initialTest = await testAuth(API_SECRET, METHOD + PATH + TIMESTAMP + BODY);
    console.log(`Status: ${initialTest.status}`);
    console.log(`Response: ${initialTest.message}`);
    console.log('===========================================\n');
    // Test all combinations in a grid
    console.log('Testing all variations of secrets and payloads...');
    console.log('First row marks combinations that worked!\n');
    // Track successful combinations
    const successes = [];
    // Create grid header
    let header = '| Payload \\ Secret |';
    secretVariations.forEach(sv => {
        header += ` ${sv.name} |`;
    });
    console.log(header);
    // Create separator row
    let separator = '|----------------|';
    secretVariations.forEach(() => {
        separator += '------------|';
    });
    console.log(separator);
    // Try each combination
    for (const payload of payloads) {
        let row = `| ${payload.name} |`;
        for (const secretVar of secretVariations) {
            // Make the actual API request with this combination
            const result = await testAuth(secretVar.secret, payload.data);
            // Check if it worked
            if (result.status === 200) {
                row += ' ✅ SUCCESS |';
                successes.push({
                    payload: payload.name,
                    secret: secretVar.name
                });
            }
            else {
                row += ` ❌ ${result.status} |`;
            }
        }
        console.log(row);
    }
    console.log('\n===========================================');
    // Print working combinations
    if (successes.length > 0) {
        console.log('\n✅ WORKING COMBINATIONS FOUND:');
        successes.forEach(s => {
            console.log(`- Payload: ${s.payload}, Secret: ${s.secret}`);
        });
    }
    else {
        console.log('\n❌ NO WORKING COMBINATIONS FOUND');
        console.log('You might need to:');
        console.log('1. Register a new team to get a fresh API key/secret pair');
        console.log('2. Check server logs for detailed error messages');
        console.log('3. Verify the server is configured correctly');
    }
    console.log('\n===========================================');
}
main().catch(err => console.error('Error running tests:', err));
