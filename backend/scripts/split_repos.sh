#!/usr/bin/env bash
set -euo pipefail

# Split the monorepo into three standalone repos preserving history using git subtree
# Usage:
#   scripts/split_repos.sh <backend_remote_url> <frontend_remote_url> <flutter_remote_url>

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <backend_remote_url> <frontend_remote_url> <flutter_remote_url>"
  exit 1
fi

BACKEND_REMOTE="$1"
FRONTEND_REMOTE="$2"
FLUTTER_REMOTE="$3"

echo "Adding remotes..."
git remote remove backend-split 2>/dev/null || true
git remote remove frontend-split 2>/dev/null || true
git remote remove flutter-split 2>/dev/null || true

git remote add backend-split "$BACKEND_REMOTE"
git remote add frontend-split "$FRONTEND_REMOTE"
git remote add flutter-split "$FLUTTER_REMOTE"

echo "Creating split branches with git subtree..."
git subtree split --prefix=backend -b split-backend
git subtree split --prefix=frontend -b split-frontend
git subtree split --prefix=flutter_app -b split-flutter

echo "Pushing split branches to their remotes..."
git push backend-split split-backend:main -f
git push frontend-split split-frontend:main -f
git push flutter-split split-flutter:main -f

echo "Done. Each new repo has the full history for its directory."


