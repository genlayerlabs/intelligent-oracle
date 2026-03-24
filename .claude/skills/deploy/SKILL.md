---
name: deploy
description: Deploy GenLayer intelligent contracts using the deployment script. User-invoked only.
disable-model-invocation: true
---

Deploy contracts using the scripts module. Accepts optional arguments via $ARGUMENTS.

```bash
cd /Users/edgars/Dev/intelligent-oracle/scripts && npm run deploy $ARGUMENTS
```

Before deploying:
1. Confirm the target RPC endpoint in scripts/.env
2. Confirm the user intends to deploy (this modifies on-chain state)

After deployment, report the contract address(es) returned.
