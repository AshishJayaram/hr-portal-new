#!/usr/bin/env bash
set -euo pipefail

# Remove non-essential sample uploads and artifacts to slim the repo

echo "Pruning optional assets..."

rm -rf backend/uploads/feedback || true

# Keep structure but remove bulky PDFs except a couple of samples
find backend/uploads/reimbursements -type f -name '*.pdf' | tail -n +3 | xargs -r rm -f
find backend/uploads/documents -type f -name '*.pdf' | tail -n +3 | xargs -r rm -f
find backend/uploads/private_docs -type f -name '*.pdf' | tail -n +3 | xargs -r rm -f

echo "Done."


