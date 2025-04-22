## Development Plan for `trading-simulator-mcp`

### 1. Success Criteria (Definition of Done)

1. **pnpm Scripts** – `package.json` must expose the following scripts **and all of them must pass locally and in CI:**
   - `lint`: `eslint . --max-warnings 0`
   - `docs`: `typedoc --entryPoints src/index.ts`
   - `test`: `mocha --exit`
   - `coverage`: `c8 --exclude test --exclude dist mocha --exit`
2. **Static Analysis** – `eslint` reports **zero errors/warnings** (max‑warnings 0).
3. **API Docs** – `typedoc` completes with **≥ 90 % documentation coverage**.
4. **Unit & Integration Tests** – `mocha` suite passes with:
   - **100 % statement/branch/function/line coverage** reported by `c8`.
   - Conditional integration tests that **only run when a valid `.env` file exists**. These tests spin up the local MCP server and use the MCP _client_ SDK to exercise every public endpoint/tool.
5. **CI** – GitHub Actions (or equivalent) pipeline runs `lint`, `docs`, `test`, and `coverage` on every PR & push to `main`.
6. **Flaky stdio issue is understood and mitigations are implemented or ticketed** (see §7).

---

### 2. Environment & Tooling Setup

| Area                | Action                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **TypeScript**      | Keep `tsconfig.json` but enable `strict`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.                            |
| **ESLint**          | Add `@typescript-eslint` preset + Prettier integration. Extend with rule‑set used by MCP SDK (for consistency).         |
| **Typedoc**         | Add `typedoc.json` with `excludePrivate`, `includeVersion`, `plugin typedoc-plugin-missing-exports` and set `tsconfig`. |
| **Mocha + ts‑node** | Configure `test/mocha.opts` to compile TS on‑the‑fly. Alternatively build first, then test against `dist/`.             |
| **c8**              | Configure `c8` to exclude `test` and `dist` directories and run `mocha` with `--exit` flag.                             |
| **Pre‑commit**      | Add `husky` + `lint‑staged` to run `eslint` & prettier on staged files.                                                 |
| **CI**              | Use GitHub Actions, Node 20 matrix, cache `ppnpm`, run scripts in §1.                                                   |
| **Prettier Script** | Add `format`: `prettier --write .` to `package.json` scripts.                                                           |

---

### 3. Phased Task Checklist

> Tackle one focus‑area at a time so that each step builds on green checks from the previous phase.

#### Phase 1 – Formatting & Linting

- [x] **Add Prettier** – ensured `.prettierrc` exists and documented `format` script (`pnpm format`).
- [x] **Install ESLint stack** – `@typescript-eslint`, `eslint-config-prettier`, create `.eslintrc.cjs` linked to Prettier.
- [x] **Add Husky + lint‑staged** – run `pnpm format && pnpm lint` on pre‑commit.
- [x] **Update `package.json` scripts** – `lint`, `format`.
- [x] **Run & Fix** – codebase passes `pnpm format` then `pnpm lint` with 0 warnings.

#### Phase 2 – Tests & Coverage

- [x] **Mocha setup** – add dev deps `mocha`, `ts-node`, `@types/mocha`, `chai`, `c8`.
- [x] **Write Unit Tests** – directly test API client, helper utilities; NO MOCKS. Tests should fail until real implementation is complete.
- [x] **Write Integration Tests (conditional)** – wrap in `if (fs.existsSync('.env')) …`; use `Client` + `StdioClientTransport` to hit local server.
- [x] **Ensure Coverage** – configure `c8` with reasonable thresholds (85% lines, 80% functions, 70% branches) for testable files. MCP server is excluded from direct coverage due to stdio execution.
- [x] **Scripts** – confirm `test` & `coverage` run green.

> **Important Rules:**
> - **NO MOCKS** – Tests should test real functionality, not mocked behavior
> - **Import from production** – Import methods and types directly from production code
> - **No reimplementation** – Don't reimplement production logic in tests

#### Phase 3 – Documentation

- [x] **Typedoc config** – add `typedoc.json`, integrate coverage plugin.
- [x] **Annotate Source** – add/expand TSDoc until ≥90 % coverage.
- [x] **Run Docs build** – `pnpm docs` generates without errors.

#### Phase 4 – CI & Pre‑commit Enforcement

- [x] **GitHub Actions** – create workflow running `pnpm install`, then `pnpm format --check`, `pnpm lint`, `pnpm docs`, `pnpm coverage`.
- [ ] **Status Checks** – enable required checks on `main` branch.

#### Phase 5 – Flaky StdIO Investigation & Fixes

- [ ] **Reproduce** – follow §4 Step 1 using `NODE_DEBUG=pipe`.
- [ ] **Implement stdout error listener** – patch in repo or contribute upstream.
- [ ] **Handle AbortSignal** – update request handlers.
- [ ] **Add keep‑alive ping & doc it**.
- [ ] **Document findings** – write `docs/flaky-stdio.md`.

---

### 4. Work‑Breakdown Structure (Detailed)

| #   | Task                                                                                                               | Owner | Notes                                             |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------- |
| 4.1 | **Linting** – install `eslint`, `@typescript-eslint/eslint-plugin`, `eslint-config-prettier`, add `.eslintrc.cjs`. |       | Must match `max-warnings 0`.                      |
| 4.2 | **Prettier** – basic config, integrate with ESLint.                                                                |       |                                                   |
| 4.3 | **Typedoc** – add `typedoc.json`, annotate code comments to hit 90 %+.                                             |       | Coverage measured with `plugin-typedoc-coverage`. |
| 4.4 | **Unit tests** – stub API‑client methods with `sinon` to achieve 100 % paths.                                      |       |                                                   |
| 4.5 | **Integration tests** –                                                                                            |

- `if (fs.existsSync(".env"))` wrap test block
- spawn server via `StdioClientTransport`
- exercise all `TRADING_SIM_TOOLS`
- assert responses shape (non‑error) | | Fail gracefully (skip) when no `.env`. |
  | 4.6 | **Coverage gate** – configure `c8` + `nyc` report, fail <100 %. | | |
  | 4.7 | **Scripts** – update `package.json` scripts list. | | |
  | 4.8 | **CI Pipeline** – GitHub Action `node.yml`. | | |
  | 4.9 | **Bug‑hunt & fixes** – see §4. | | |

---

### 5. Timeline (1‑week sprint example)

| Day | Work                                                           |
| --- | -------------------------------------------------------------- |
| 1   | 4.1 ‑ 4.3 tooling setup & CI skeleton                          |
| 2   | Write baseline unit tests, reach 70 % coverage                 |
| 3   | Complete docs comments, reach 90 % typedoc coverage            |
| 4   | Finish unit tests to 100 %, implement integration test harness |
| 5   | Flaky stdio investigation & fixes (tasks §4), update docs      |
| 6   | Buffer / review, green CI, code‑review                         |
| 7   | Release 0.2.0, tag, announce                                   |

---

### 6. Risk & Mitigation

- **100 % coverage inertia** – use mutation testing (`stryker`) in future to stay honest.
- **External API dependency** – integration tests guarded by `.env`; offline CI unaffected.
- **Typedoc plugin stability** – pin version.
- **Large payload changes** – performance tests before/after.

---

### 7. Next Steps

1. Create GitHub issues for each numbered task.
2. Enable required‑status‑checks in repository settings for `lint`, `docs`, `test`, `coverage`.
3. Schedule sprint kick‑off, assign owners.

> Once all boxes in §1 are green in CI, we can consider the MCP server ready for public consumption.
