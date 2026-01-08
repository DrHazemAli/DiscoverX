# Linting & Code Quality Guide

This guide covers the linting setup, code formatting, and quality enforcement tools used in DiscoverX.

## Table of Contents

- [Overview](#overview)
- [ESLint Configuration](#eslint-configuration)
- [Lint-Staged](#lint-staged)
- [Husky Git Hooks](#husky-git-hooks)
- [Commit Message Format](#commit-message-format)
- [Running Linters](#running-linters)
- [IDE Integration](#ide-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

DiscoverX uses a comprehensive code quality toolchain:

| Tool | Purpose |
|------|---------|
| **ESLint** | JavaScript/TypeScript linting |
| **TypeScript** | Type checking |
| **Husky** | Git hooks management |
| **lint-staged** | Run linters on staged files only |

### Quality Gates

Before code can be committed:

```
┌─────────────────────────────────────────────────────────────┐
│                    Pre-commit Checks                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ lint-staged  │───►│   ESLint     │───►│   Commit     │  │
│  │ (staged only)│    │  (auto-fix)  │    │  (allowed)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Commit Message Validation                │   │
│  │         (conventional commit format)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ESLint Configuration

### Configuration File

ESLint is configured in `eslint.config.mjs` using the flat config format:

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

### Included Rules

The configuration extends:

| Config | Description |
|--------|-------------|
| `eslint-config-next/core-web-vitals` | Next.js recommended rules + Core Web Vitals |
| `eslint-config-next/typescript` | TypeScript-specific rules |

### Key Rules Enforced

#### React & Next.js

| Rule | Setting | Description |
|------|---------|-------------|
| `react-hooks/rules-of-hooks` | error | Enforce hooks rules |
| `react-hooks/exhaustive-deps` | warn | Check effect dependencies |
| `@next/next/no-html-link-for-pages` | error | Use Next.js Link component |
| `@next/next/no-img-element` | warn | Use Next.js Image component |

#### TypeScript

| Rule | Setting | Description |
|------|---------|-------------|
| `@typescript-eslint/no-unused-vars` | error | No unused variables |
| `@typescript-eslint/no-explicit-any` | warn | Avoid `any` type |
| `@typescript-eslint/consistent-type-imports` | warn | Use `import type` |

### Ignored Paths

The following paths are excluded from linting:

```
.next/**          # Next.js build output
out/**            # Static export output
build/**          # Build artifacts
next-env.d.ts     # Auto-generated types
node_modules/**   # Dependencies (default)
```

### Adding Custom Rules

To add custom rules, modify `eslint.config.mjs`:

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rules
  {
    rules: {
      // Enforce consistent imports
      "import/order": ["warn", {
        "groups": ["builtin", "external", "internal"],
        "newlines-between": "always"
      }],
      // No console.log in production code
      "no-console": ["warn", { allow: ["warn", "error"] }],
    }
  }
]);

export default eslintConfig;
```

---

## Lint-Staged

### Configuration

lint-staged is configured in `package.json`:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### How It Works

1. You stage files with `git add`
2. On commit, lint-staged runs
3. Only staged files are processed
4. Auto-fixable issues are fixed automatically
5. If unfixable errors exist, commit is blocked

### File Type Handlers

| Pattern | Action |
|---------|--------|
| `*.{js,jsx,ts,tsx}` | ESLint with auto-fix |
| `*.{json,md,yml,yaml}` | Prettier formatting |

### Adding More Handlers

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.css": [
      "stylelint --fix"
    ],
    "*.sql": [
      "sql-formatter"
    ]
  }
}
```

---

## Husky Git Hooks

### Installed Hooks

#### Pre-commit (`.husky/pre-commit`)

Runs before every commit:

```bash
npx lint-staged
```

This ensures:
- All staged JS/TS files pass ESLint
- JSON/Markdown files are formatted

#### Commit-msg (`.husky/commit-msg`)

Validates commit message format:

```bash
#!/bin/sh

commit_regex='^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?: .{1,72}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "❌ Invalid commit message format!"
    echo ""
    echo "Valid format: type(scope): description"
    echo ""
    echo "Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build"
    exit 1
fi
```

### Adding New Hooks

```bash
# Create a new hook
echo 'npm run typecheck' > .husky/pre-push
chmod +x .husky/pre-push
```

### Bypassing Hooks (Emergency Only)

```bash
# Skip all hooks
git commit --no-verify -m "emergency fix"

# Skip specific hook
HUSKY=0 git commit -m "skip hooks"
```

⚠️ **Warning**: Only bypass hooks in emergencies. All code should pass linting.

---

## Commit Message Format

### Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(search): add language filter` |
| `fix` | Bug fix | `fix(api): handle null response` |
| `docs` | Documentation | `docs(readme): update setup guide` |
| `style` | Formatting | `style: fix indentation` |
| `refactor` | Code restructure | `refactor(scoring): extract helpers` |
| `perf` | Performance | `perf(query): add index hint` |
| `test` | Tests | `test(api): add search tests` |
| `chore` | Maintenance | `chore(deps): update packages` |
| `ci` | CI/CD | `ci: add lint workflow` |
| `build` | Build system | `build: update webpack config` |

### Scope (Optional)

The scope indicates which part of the codebase is affected:

- `api` - API routes
- `ui` - UI components
- `db` - Database
- `auth` - Authentication
- `search` - Search functionality
- `scoring` - Scoring system
- `deps` - Dependencies

### Examples

```bash
# Feature with scope
git commit -m "feat(search): add fuzzy matching support"

# Bug fix without scope
git commit -m "fix: resolve memory leak in chart component"

# Documentation
git commit -m "docs(api): add rate limiting section"

# Breaking change
git commit -m "feat(api)!: change response format"

# With body
git commit -m "refactor(scoring): simplify algorithm

Extract common calculations into utility functions.
Reduce code duplication across scoring dimensions."
```

---

## Running Linters

### Available Commands

```bash
# Run ESLint on all files
npm run lint

# Run ESLint with auto-fix
npm run lint -- --fix

# Type check without emitting
npx tsc --noEmit

# Run lint-staged manually
npx lint-staged

# Check specific file
npx eslint src/components/ui/Button.tsx
```

### Recommended Workflow

```bash
# Before committing, run full check
npm run lint && npx tsc --noEmit

# Auto-fix what can be fixed
npm run lint -- --fix

# Stage and commit
git add .
git commit -m "feat: your feature"
```

### CI Integration

Add to your CI workflow:

```yaml
# .github/workflows/lint.yml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
```

---

## IDE Integration

### VS Code

#### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

#### Settings

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### WebStorm / IntelliJ

1. Go to **Preferences** → **Languages & Frameworks** → **JavaScript** → **Code Quality Tools** → **ESLint**
2. Enable **Automatic ESLint configuration**
3. Check **Run eslint --fix on save**

---

## Troubleshooting

### Common Issues

#### "ESLint couldn't find config"

```bash
# Ensure dependencies are installed
npm install

# Check config exists
cat eslint.config.mjs
```

#### "Parsing error: Cannot find module"

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

#### "Husky hooks not running"

```bash
# Reinstall husky
npm run prepare

# Check hooks are executable
ls -la .husky/
chmod +x .husky/*
```

#### "lint-staged not finding files"

```bash
# Check git status
git status

# Ensure files are staged
git add <file>
```

#### Commit blocked by linting errors

```bash
# See what's wrong
npm run lint

# Auto-fix if possible
npm run lint -- --fix

# Fix remaining issues manually
```

### Disabling Rules

#### Disable for a line

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;
```

#### Disable for a file

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// entire file uses any
```

#### Disable in config

```javascript
// eslint.config.mjs
{
  rules: {
    "@typescript-eslint/no-explicit-any": "off"
  }
}
```

⚠️ **Warning**: Avoid disabling rules unless absolutely necessary. Fix the underlying issue instead.

---

## Best Practices

### Do's ✅

- Run `npm run lint` before pushing
- Fix linting errors, don't disable them
- Use meaningful commit messages
- Keep commits atomic and focused
- Review auto-fixed changes before committing

### Don'ts ❌

- Don't commit with `--no-verify` regularly
- Don't disable ESLint rules without justification
- Don't ignore TypeScript errors
- Don't mix unrelated changes in one commit

---

## Related Documentation

- [Contributing Guide](./CONTRIBUTING.md) - Overall contribution process
- [Architecture](./ARCHITECTURE.md) - Code organization
- [Getting Started](./GETTING_STARTED.md) - Initial setup

---

**Maintained by [CognitionX Community](https://github.com/DrHazemAli/DiscoverX)**
