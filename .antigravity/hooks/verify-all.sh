#!/usr/bin/env bash
set -e

echo "🔍 [Hook: 1/3] Running ESLint..."
npm run lint

echo "📘 [Hook: 2/3] Running TypeScript Type Check..."
npx tsc --noEmit

echo "🧪 [Hook: 3/3] Running Vitest Unit Tests..."
npm run test:run

echo "✅ All quality checks passed!"