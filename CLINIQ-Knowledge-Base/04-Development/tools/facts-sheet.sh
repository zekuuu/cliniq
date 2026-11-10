#!/usr/bin/env bash
# Regenerate the headline numbers in CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md.
# Run from the repository root. Reads live sources only; writes to stdout.
# Design: no dependencies beyond bash, grep, find, wc, sed. Safe on Windows (Git Bash).

set -euo pipefail

say() { printf '%s\n' "$*"; }
count() { "$@" | wc -l | tr -d ' '; }

cd "$(dirname "$0")/../../.."

ts="$(TZ=Asia/Manila date '+%A, %B %d, %Y — %H:%M PHT')"
commit="$(git rev-parse HEAD)"
branch="$(git rev-parse --abbrev-ref HEAD)"

adr_count="$(ls CLINIQ-Knowledge-Base/06-Decisions/ADR-*.md 2>/dev/null | grep -v Template | wc -l | tr -d ' ')"
adr_first="$(ls CLINIQ-Knowledge-Base/06-Decisions/ADR-*.md 2>/dev/null | grep -v Template | head -1 | sed -E 's|.*/(ADR-[0-9]+).*|\1|')"
adr_last="$(ls CLINIQ-Knowledge-Base/06-Decisions/ADR-*.md 2>/dev/null | grep -v Template | tail -1 | sed -E 's|.*/(ADR-[0-9]+).*|\1|')"

routes="$(grep -rhE '<Route ' frontend/src --include='*.tsx' 2>/dev/null | grep -oE 'path="[^"]*"' | sort -u | wc -l | tr -d ' ')"
screens="$(grep -cE '^[0-9]+\. \*\*' CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md)"
mock_funcs="$(grep -cE '^export (async )?function |^export const [a-zA-Z]+ = (async )?\(' frontend/src/lib/mock-db/api.ts)"
mock_types="$(grep -cE '^export (type|interface) ' frontend/src/lib/mock-db/types.ts)"

tables="$(grep -cE '^CREATE TABLE ' CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql)"
checks="$(grep -cE 'CHECK \(' CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql)"
uniques="$(grep -cE 'UNIQUE ' CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql)"
migrations="$(find backend/app -path '*Database/Migrations/*.php' 2>/dev/null | wc -l | tr -d ' ')"

contract_endpoints="$(grep -ohE '(GET|POST|PATCH|PUT|DELETE) /[a-zA-Z0-9{}/_:-]+' CLINIQ-Knowledge-Base/04-Development/API-Contract.md 2>/dev/null | sort -u | wc -l | tr -d ' ')"
backend_tests="$(find backend/tests -name '*.php' -not -name 'Pest.php' -not -name 'TestCase.php' 2>/dev/null | wc -l | tr -d ' ')"
frontend_tests="$(find frontend/src -name '*.test.*' 2>/dev/null | wc -l | tr -d ' ')"

cat <<EOF
Timestamp: $ts
Commit: $commit
Branch: $branch

ADRs: $adr_count ($adr_first to $adr_last; the template is not counted).
Screens: $screens numbered entries in Screen-Inventory.md.
Routes: $routes unique \`path="…"\` entries in frontend/src/**/*.tsx.
Mock API functions: $mock_funcs exports in frontend/src/lib/mock-db/api.ts.
Mock entity types: $mock_types exports in frontend/src/lib/mock-db/types.ts.
Tables in Reference-Schema.sql: $tables.
CHECK constraints: $checks.
UNIQUE constraints: $uniques.
Migrations on disk: $migrations.
API contract endpoints: $contract_endpoints unique method+path lines in API-Contract.md.
Backend test files (excluding Pest.php, TestCase.php): $backend_tests.
Frontend test files: $frontend_tests.
EOF
