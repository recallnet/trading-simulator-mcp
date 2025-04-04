/**
 * Debug script for server-side authentication issues
 *
 * This script provides more detailed information about what might be going wrong
 * on the server side. It's designed to suggest changes to make to the server code
 * to help diagnose the issue.
 */
import { config } from 'dotenv';
// Load environment variables
config();
// API credentials from environment
const apiKey = process.env.TRADING_SIM_API_KEY || '';
const apiSecret = process.env.TRADING_SIM_API_SECRET || '';
const baseUrl = process.env.TRADING_SIM_API_URL || 'http://localhost:3000';
function printServerSideInstructions() {
    console.log(`
===========================================================================
SERVER-SIDE CHANGES TO HELP DIAGNOSE THE ISSUE
===========================================================================

1. Add these debug logs to your auth.middleware.ts file:

// At the top of the file after imports:
const DEBUG_AUTH = true; // Set to true to enable auth debugging

// Inside the middleware, after getting API key header:
if (DEBUG_AUTH) {
  console.log("\\n====== AUTH DEBUG ======");
  console.log(\`Received API Key: \${apiKey}\`);
  console.log(\`Expected API Key: sk_6ab34fafed68720742eb1e7f445f0355\`); // Your API key
  console.log(\`Timestamp: \${timestamp}\`);
  console.log(\`Signature: \${signature}\`);
  console.log(\`Method: \${req.method}\`);
  console.log(\`Path: \${req.originalUrl}\`);
  console.log(\`Path for signature: \${fullPath}\`);
  console.log("========================\\n");
}

2. Add these debug logs to the validateApiRequest function in team-manager.service.ts:

// At the start of the validateApiRequest function:
const debugAuth = true; // Set to true to enable debugging

// Replace console.log with more detailed information:
if (debugAuth) {
  console.log("\\n====== API REQUEST VALIDATION DEBUG ======");
  console.log(\`API Key: \${apiKey}\`);
  console.log(\`API Key found in database: \${auth ? "YES" : "NO"}\`);
  if (auth) console.log(\`Team ID from database: \${auth.teamId}\`);
  console.log(\`Method: \${method}\`);
  console.log(\`Path: \${path}\`);
  console.log(\`Timestamp: \${timestamp}\`);
  console.log(\`Body: \${body}\`);
  console.log(\`Request time: \${new Date(timestamp).getTime()}, Current time: \${Date.now()}\`);
  console.log(\`Time difference: \${Math.abs(Date.now() - new Date(timestamp).getTime())}ms\`);
  console.log(\`Data for signature: \${data}\`);
  console.log(\`Received signature: \${signature}\`);
  console.log(\`Expected signature: \${expectedSignature}\`);
  console.log(\`Signature match: \${signature === expectedSignature ? "YES" : "NO"}\`);
  console.log("======================================\\n");
}

3. Add a debug endpoint to your server in health.routes.ts:

// Add this route to dump authentication details without requiring authentication
router.get('/debug-auth-header', (req, res) => {
  const apiKey = req.header('X-API-Key');
  const timestamp = req.header('X-Timestamp');
  const signature = req.header('X-Signature');
  
  console.log("\\n====== AUTH HEADERS DEBUG ======");
  console.log(\`API Key: \${apiKey}\`);
  console.log(\`Timestamp: \${timestamp}\`);
  console.log(\`Signature: \${signature}\`);
  console.log(\`Method: \${req.method}\`);
  console.log(\`Path: \${req.originalUrl}\`);
  console.log(\`Path for signature: \${req.originalUrl.split('?')[0]}\`);
  console.log("================================\\n");
  
  return res.json({
    success: true,
    message: 'Auth headers received',
    headers: {
      apiKey,
      timestamp,
      signature
    }
  });
});

4. After making these changes, restart your server and run your tests again.

5. Check for cache issues in the server:
   - Look for places where API keys might be cached
   - Ensure the cache is updated when new teams are registered
   - Add explicit cache invalidation in the team manager

===========================================================================

The most likely issues based on our tests:

1. API key format mismatch
   - The API key in database doesn't match the one we're sending
   - There might be invisible whitespace or encoding issues

2. Path construction
   - The way paths are constructed for signature calculation may differ
   - There could be trailing slashes or other normalization issues

3. Timestamp validation
   - The server may have a strict timestamp validation that's failing

4. API key caching
   - The server might have a stale version of the API key in its cache

5. Database issues
   - The team record might not be properly saved in the database

===========================================================================
`);
}
// Print the instructions
printServerSideInstructions();
// Recommend database check commands
console.log(`
===========================================================================
DATABASE CHECK COMMANDS
===========================================================================

Run these in your server's psql database to check team registration:

1. Check if team exists in database:
   SELECT * FROM teams WHERE api_key = 'sk_6ab34fafed68720742eb1e7f445f0355';

2. Check the competition participation:
   SELECT * FROM competition_teams WHERE team_id = 'b052a1f6-18e9-4d15-8d69-f385b799a5aa';

3. Check account balances:
   SELECT * FROM balances WHERE team_id = 'b052a1f6-18e9-4d15-8d69-f385b799a5aa';

===========================================================================
RESTART THE SERVER
===========================================================================

Sometimes a simple server restart can fix cache issues:

1. Stop your trading simulator server
2. Start it again
3. Run the tests

===========================================================================
`);
