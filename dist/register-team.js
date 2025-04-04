import axios from 'axios';
/**
 * This script registers a new team and prints its API credentials
 * to use in the MCP integration.
 */
// Configuration
const SERVER_URL = 'http://localhost:3000'; // Adjust if different
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const TEAM_NAME = 'MCP Team'; // Change this as needed
async function registerNewTeam() {
    try {
        // Step 1: Login as admin
        console.log('Logging in as admin...');
        const loginResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD
        });
        if (!loginResponse.data.success || !loginResponse.data.token) {
            throw new Error('Admin login failed: ' + JSON.stringify(loginResponse.data));
        }
        const token = loginResponse.data.token;
        console.log('Admin login successful');
        // Step 2: Register a new team
        console.log('Registering new team...');
        const teamResponse = await axios.post(`${SERVER_URL}/api/admin/teams/register`, {
            teamName: TEAM_NAME,
            email: `${TEAM_NAME.toLowerCase().replace(/\s/g, '-')}@example.com`,
            contactPerson: 'MCP Integration'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!teamResponse.data.success || !teamResponse.data.team) {
            throw new Error('Team registration failed: ' + JSON.stringify(teamResponse.data));
        }
        // Step 3: Print credentials
        const { apiKey, apiSecret } = teamResponse.data.team;
        console.log('\n===========================================');
        console.log('✅ NEW TEAM REGISTERED SUCCESSFULLY');
        console.log('===========================================');
        console.log('Team Name:', TEAM_NAME);
        console.log('API Key:', apiKey);
        console.log('API Secret:', apiSecret);
        console.log('===========================================');
        console.log('\nAdd these to your .env file:');
        console.log('TRADING_SIM_API_KEY=' + apiKey);
        console.log('TRADING_SIM_API_SECRET=' + apiSecret);
        console.log('===========================================');
    }
    catch (error) {
        console.error('Error registering team:');
        if (error.response) {
            console.error('Server response:', error.response.data);
            console.error('Status code:', error.response.status);
        }
        else {
            console.error(error.message || error);
        }
    }
}
// Run the script
registerNewTeam().catch(err => console.error('Fatal error:', err));
