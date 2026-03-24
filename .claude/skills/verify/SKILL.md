---
name: verify
description: Run tests and build checks across the intelligent-oracle project. Use after making changes to validate nothing is broken.
---

Run the following verification steps and report results:

1. **Python contract tests:**
   ```bash
   cd /Users/edgars/Dev/intelligent-oracle && pip install -r test/requirements.txt -q && pytest test/ -v
   ```

2. **Explorer build check:**
   ```bash
   cd /Users/edgars/Dev/intelligent-oracle/explorer && npm run build
   ```

3. **Bridge build check:**
   ```bash
   cd /Users/edgars/Dev/intelligent-oracle/bridge && npm run build
   ```

4. **UI Wizard build check:**
   ```bash
   cd /Users/edgars/Dev/intelligent-oracle/ui-wizard && npm run build
   ```

Report a summary of pass/fail for each step. If any step fails, show the relevant error output.
