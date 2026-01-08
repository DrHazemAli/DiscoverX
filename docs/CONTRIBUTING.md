# Contributing to DiscoverX

Thank you for your interest in contributing to DiscoverX! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Be respectful and considerate
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what is best for the community

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Git
- A GitHub account
- Supabase account (or local setup)

### Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/DiscoverX.git
cd DiscoverX

# Add upstream remote
git remote add upstream https://github.com/DrHazemAli/DiscoverX.git

# Install dependencies
npm install

# Copy environment file
cp env.example .env.local
```

### Setup Development Environment

See [Getting Started Guide](./GETTING_STARTED.md) for detailed setup instructions.

---

## Development Workflow

### Branch Naming

Use descriptive branch names:

```bash
# Feature branches
git checkout -b feature/add-search-filters

# Bug fixes
git checkout -b fix/search-pagination

# Documentation
git checkout -b docs/update-api-reference

# Refactoring
git checkout -b refactor/scoring-algorithm
```

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge into your main branch
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

### Making Changes

1. Create a new branch from `main`
2. Make your changes
3. Test locally
4. Commit with meaningful messages
5. Push to your fork
6. Open a Pull Request

---

## Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] All tests pass (`npm run lint`)
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Changes are documented (if applicable)
- [ ] Commit messages follow guidelines
- [ ] PR has a clear title and description

### PR Template

When opening a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe testing steps

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**: CI runs linting and type checking
2. **Code Review**: At least one maintainer reviews
3. **Feedback**: Address any requested changes
4. **Approval**: PR is approved and merged

---

## Coding Standards

### TypeScript

```typescript
// ✅ Good: Explicit types, meaningful names
interface SearchParams {
  query: string;
  language?: string;
  page: number;
  limit: number;
}

export async function searchRepositories(
  params: SearchParams
): Promise<SearchResult> {
  // Implementation
}

// ❌ Bad: Implicit any, unclear names
export async function search(p) {
  // ...
}
```

### React Components

```tsx
// ✅ Good: TypeScript props, clear structure
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### File Organization

```
src/
├── components/
│   └── ui/
│       ├── Button.tsx      # Component
│       ├── Button.test.tsx # Tests (optional)
│       └── index.ts        # Exports
├── lib/
│   └── utils.ts            # Utilities
└── contracts/
    └── repos.ts            # Zod schemas
```

### Import Order

```typescript
// 1. External packages
import { useState, useEffect } from 'react';
import { z } from 'zod';

// 2. Internal modules (using @ alias)
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SearchRequestSchema } from '@/contracts';

// 3. Relative imports
import { useLocalState } from './hooks';
```

### Tailwind CSS

```tsx
// ✅ Good: Use cn() utility, organized classes
<div className={cn(
  'flex items-center gap-4',      // Layout
  'p-4 rounded-lg border',         // Spacing & borders
  'bg-white dark:bg-gray-900',    // Colors
  'hover:shadow-md transition',    // States
  className                        // Allow overrides
)}>

// ❌ Bad: Long inline strings, no organization
<div className="flex items-center gap-4 p-4 rounded-lg border bg-white dark:bg-gray-900 hover:shadow-md transition-all duration-200 ease-in-out">
```

---

## Commit Guidelines

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no new feature or fix |
| `perf` | Performance improvement |
| `test` | Adding tests |
| `chore` | Maintenance tasks |

### Examples

```bash
# Feature
git commit -m "feat(search): add language filter dropdown"

# Bug fix
git commit -m "fix(rankings): correct pagination offset"

# Documentation
git commit -m "docs(api): add rate limit section"

# Refactor
git commit -m "refactor(scoring): extract factor calculations"
```

### Rules

- Use present tense ("add" not "added")
- Use imperative mood ("add" not "adds")
- Keep first line under 72 characters
- Reference issues when relevant: `fix(search): handle empty query (#123)`

---

## Testing

### Running Tests

```bash
# Lint code
npm run lint

# Type check
npx tsc --noEmit

# Run all checks
npm run lint && npx tsc --noEmit
```

### Testing Guidelines

1. **Unit Tests**: For pure functions (core domain logic)
2. **Integration Tests**: For API routes and database queries
3. **E2E Tests**: For critical user flows

### What to Test

- Business logic in `src/core/`
- API request/response validation
- Error handling paths
- Edge cases

---

## Documentation

### When to Update Docs

- Adding new features
- Changing API endpoints
- Modifying database schema
- Updating configuration options

### Documentation Structure

```
docs/
├── GETTING_STARTED.md  # Setup guide
├── ARCHITECTURE.md     # System design
├── DATABASE.md         # Schema docs
├── API.md              # API reference
├── SECURITY.md         # Security docs
└── CONTRIBUTING.md     # This file
```

### Writing Style

- Use clear, concise language
- Include code examples
- Add diagrams for complex concepts
- Keep documentation up-to-date with code

---

## Issue Guidelines

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, browser)
- Screenshots if applicable

### Feature Requests

Include:
- Problem description
- Proposed solution
- Alternative solutions considered
- Why this would benefit users

---

## Questions?

If you have questions:

1. Check existing documentation
2. Search existing issues
3. Open a new discussion/issue

---

## Recognition

Contributors are recognized in:
- GitHub's contributor graph
- Release notes (for significant contributions)

Thank you for contributing to DiscoverX! 🎉

---

**Maintained by [CognitionX Community](https://github.com/DrHazemAli/DiscoverX)**
