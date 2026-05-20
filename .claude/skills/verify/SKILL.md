---
name: verify
description: Run tests and build checks across the intelligent-oracle project. Use after making changes to validate nothing is broken.
---

Run the following verification steps and report results:

1. **Root app lint, typecheck, tests, and build:**
   ```bash
   npm run check
   ```

2. **Production dependency audit:**
   ```bash
   npm audit --omit=dev
   ```

3. **Python contract tests, optional when the GenLayer test environment is available:**
   ```bash
   python3 -m venv .venv && . .venv/bin/activate && python -m pip install -r test/requirements.txt -q && python -m pytest test/ -v
   ```

Report a summary of pass/fail for each step. If any step fails, show the relevant error output. Do not run deployment commands as part of routine verification.
