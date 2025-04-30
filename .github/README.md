# GitHub Actions Workflows

This directory contains GitHub Actions workflow definitions for the Trading Simulator MCP.

## Workflow Files

- `ci.yml` - Main CI/CD workflow that builds the project and runs MCP evaluations

## Running Workflows Locally with Act

[Act](https://github.com/nektos/act) allows you to run GitHub Actions workflows locally. This is useful for testing changes to workflows before pushing them to GitHub.

### Prerequisites

1. Install Docker on your machine
2. Install Act:
   ```
   # macOS
   brew install act

   # Linux
   curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
   ```

### Setting Up Secrets

When running workflows locally, you need to provide secrets that would normally be stored in GitHub. Create a `.secrets` file in the repository root:

```bash
# Create .secrets file
touch .secrets
```

Add your secrets to the file in the format:

```
OPENAI_API_KEY=sk-...
TRADING_SIM_API_KEY=your-api-key
TRADING_SIM_API_URL=https://api.example.com
```

Make sure to keep this file private and add it to your `.gitignore` to prevent committing secrets.

### Running Workflows

To run the CI workflow locally:

```bash
# List available workflows
act -l

# Run the workflow on workflow_dispatch event (recommended for testing)
act workflow_dispatch -W .github/workflows/ci.yml --secret-file .secrets

# For arm64 architecture (Apple M1/M2 Macs), add the architecture flag
act workflow_dispatch -W .github/workflows/ci.yml --container-architecture linux/arm64 --secret-file .secrets
```

### Troubleshooting

1. **Missing dependencies**: Some dependencies like `tsx` are required by the evaluation process. The workflow is set up to install these automatically.

2. **Permissions issues**: You might need to run Docker with elevated permissions or ensure your user has the correct permissions.

3. **Platform compatibility**: If you're on arm64 architecture (like Apple Silicon Macs), use the `--container-architecture linux/arm64` flag.

4. **Volume mounts**: If you encounter issues with volume mounts, you may need to adjust Docker settings to allow mounting of your workspace directory.

## Best Practices

1. Always test workflow changes locally before pushing to GitHub
2. Keep secrets in the `.secrets` file, never commit them to the repository
3. Don't rely on default values for critical environment variables
4. Update the evaluation process when you modify the MCP API 