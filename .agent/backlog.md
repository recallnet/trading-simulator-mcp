# Trading Simulator MCP - Backlog Items

## Completed Tasks

1. **Phase 1 – Formatting & Linting**
   - ✅ Added Prettier configuration
   - ✅ Set up ESLint with TypeScript
   - ✅ Added Husky + lint-staged for pre-commit hooks
   - ✅ Updated package.json scripts for linting and formatting

2. **Phase 2 – Tests & Coverage**
   - ✅ Set up Mocha, ts-node, chai for testing
   - ✅ Wrote unit tests for API client with no mocks
   - ✅ Implemented conditional integration tests
   - ✅ Configured c8 with reasonable thresholds
   - ✅ Ensured all test scripts pass

3. **Phase 3 – Documentation**
   - ✅ Added Typedoc configuration
   - ✅ Added comprehensive TSDoc comments
   - ✅ Verified docs build successfully

4. **Phase 4 – CI & Pre-commit Enforcement**
   - ✅ Created GitHub Actions workflow in `.github/workflows/ci.yml`

5. **Phase 5 – Flaky StdIO Investigation & Fixes**
   - ✅ Reproduced the issue with `NODE_DEBUG=pipe`
   - ✅ Implemented stdout error listeners
   - ✅ Added support for AbortSignal in request handlers
   - ✅ Implemented keep-alive ping mechanism
   - ✅ Documented findings in `docs/flaky-stdio.md`

## Remaining Tasks

1. **GitHub Repository Configuration**
   - [ ] Enable required status checks for `main` branch in GitHub repository settings
   - [ ] Configure branch protection rules for `main` branch

## Implementation Notes

### Coverage Strategy

We've configured c8 to focus on the following files with these thresholds:
- `src/api-client.ts`
- `src/env.ts`
- `src/types.ts`

Thresholds:
- 85% lines coverage
- 80% function coverage
- 70% branch coverage

The `src/index.ts` file was excluded from coverage requirements since it contains the MCP server that runs in a separate process during integration tests.

### Testing Strategy

1. **Unit Tests**
   - Test API client methods and helpers with real implementations
   - No mocking of business logic

2. **Integration Tests**
   - Conditionally run when `.env` file exists
   - Use stdio transport to launch and test the real MCP server
   - Cover all available tools with real API calls

3. **Error Handling Tests**
   - Test network errors, API errors, and parsing errors
   - Ensure proper error propagation

### Future Improvements

1. Consider refactoring `index.ts` to make the MCP server more testable:
   - Extract handlers to separate modules
   - Make tool functionality importable/testable without full server startup

2. Consider implementing a more robust testing strategy for `index.ts`:
   - Using custom coverage collection in a child process
   - Create a test-specific server setup that's more easily instrumentable

3. Investigate flaky stdio issues and implement mitigations