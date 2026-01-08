# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Measures

DiscoverX implements comprehensive security measures to protect user data and prevent common vulnerabilities.

### Authentication & Authorization

- **Supabase Auth** - Secure authentication with email/password, magic links, and OAuth providers
- **Row Level Security (RLS)** - Database-level access control policies
- **Role-Based Access Control (RBAC)** - Granular permissions system with roles: `user`, `moderator`, `admin`, `super_admin`
- **Session Management** - Secure httpOnly cookies with automatic refresh

### Application Security

- **Content Security Policy (CSP)** - Strict CSP with nonce-based script execution
- **Security Headers** - HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Input Validation** - All inputs validated with Zod schemas
- **Parameterized Queries** - Protection against SQL injection
- **XSS Prevention** - React's built-in escaping + CSP

### Infrastructure Security

- **Internal Endpoints** - Protected with `x-internal-secret` header
- **Rate Limiting** - Configurable rate limits on API endpoints
- **Request Tracing** - Unique request IDs for audit trails
- **Audit Logging** - Security-relevant actions logged to database

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow responsible disclosure practices.

### How to Report

1. **GitHub Security Advisories** (Preferred)
   - Go to [Security Advisories](https://github.com/DrHazemAli/DiscoverX/security/advisories)
   - Click "Report a vulnerability"
   - Provide detailed information

2. **GitHub Issues**
   - For non-sensitive security concerns, open an issue
   - Label it with `security`

### What to Include

- Type of vulnerability (XSS, SQL Injection, Auth bypass, etc.)
- Step-by-step reproduction instructions
- Proof of concept (if applicable)
- Potential impact assessment
- Suggested fix (if any)

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Initial Response | 48 hours |
| Triage | 5 business days |
| Fix Development | Varies by severity |
| Disclosure | After fix is deployed |

### Severity Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| **Critical** | RCE, Auth bypass, Data breach | Immediate |
| **High** | SQL injection, Privilege escalation | 24 hours |
| **Medium** | XSS, CSRF, Information disclosure | 72 hours |
| **Low** | Configuration issues, Minor leaks | 1 week |

## Security Best Practices for Contributors

### Code Review Checklist

- [ ] No hardcoded secrets or credentials
- [ ] All user inputs validated
- [ ] No direct SQL string concatenation
- [ ] Server-only modules don't leak to client
- [ ] Sensitive data properly handled
- [ ] Error messages don't expose internal details

### Environment Variables

```bash
# Public (safe for client)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Private (server-only)
SUPABASE_SERVICE_ROLE_KEY=     # Never expose
INTERNAL_API_SECRET=           # Internal endpoint protection
GITHUB_TOKEN=                  # GitHub API access
```

### Module Boundaries

```
# Client code cannot import from:
- src/server/**
- src/dal/**

# Core domain cannot import:
- src/dal/**
- src/server/**
- External frameworks (next/*, react/*)
```

## Security Headers

DiscoverX applies the following security headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-xxx'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Audit History

| Date | Scope | Finding | Status |
|------|-------|---------|--------|
| 2026-01-08 | Full Penetration Test | See [Audit Report](./knw/SECURITY_AUDIT_REPORT.md) | ✅ Resolved |

---

**Maintained by [CognitionX Community](https://github.com/DrHazemAli/DiscoverX)**
