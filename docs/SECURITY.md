# Security Documentation

This document provides comprehensive security documentation for DiscoverX, including implementation details, best practices, and guidelines for secure development.

## Table of Contents

- [Security Architecture](#security-architecture)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Data Protection](#data-protection)
- [Input Validation](#input-validation)
- [Security Headers](#security-headers)
- [Rate Limiting](#rate-limiting)
- [Audit Logging](#audit-logging)
- [Secure Development](#secure-development)
- [Incident Response](#incident-response)

---

## Security Architecture

### Defense in Depth

DiscoverX implements multiple layers of security:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Security Layers                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Layer 1: Network Security                                       │ │
│  │ - HTTPS/TLS encryption                                          │ │
│  │ - Security headers (CSP, HSTS, etc.)                           │ │
│  │ - Rate limiting                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Layer 2: Application Security                                   │ │
│  │ - Input validation (Zod schemas)                               │ │
│  │ - Output encoding                                               │ │
│  │ - Session management                                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Layer 3: Authentication & Authorization                         │ │
│  │ - Supabase Auth                                                 │ │
│  │ - Role-based access control (RBAC)                             │ │
│  │ - Permission system                                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Layer 4: Database Security                                      │ │
│  │ - Row Level Security (RLS)                                      │ │
│  │ - Parameterized queries                                         │ │
│  │ - Encrypted connections                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Trust Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│                    UNTRUSTED (Internet)                          │
│                                                                   │
│   Browser ──────► CDN/Edge ──────► Application                   │
│                                                                   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
              ═══════════╪═══════════  Trust Boundary
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                    TRUSTED (Internal)                            │
│                                                                   │
│   Application ────► Database                                     │
│        │                                                          │
│        └──────────► GitHub API                                   │
│        │                                                          │
│        └──────────► Redis (optional)                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Authentication

### Supabase Auth

DiscoverX uses Supabase Auth for user authentication:

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### Session Management

- **Cookie-based sessions** with httpOnly flag
- **Automatic token refresh** handled by Supabase SSR
- **Session validation** on each protected route

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const result = await updateSession(request);
  
  // Check if accessing protected routes
  if (isProtectedRoute && !result.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return result.response;
}
```

### Authentication Flows

| Flow | Use Case | Security |
|------|----------|----------|
| Email/Password | Standard login | Bcrypt hashed, server-side validation |
| Magic Link | Passwordless | Time-limited tokens, single use |
| OAuth | Social login | Provider-managed security |
| Password Reset | Account recovery | Time-limited tokens, email verification |

---

## Authorization

### Role-Based Access Control (RBAC)

#### Role Hierarchy

```
super_admin (Level 4)
    │
    └── admin (Level 3)
            │
            └── moderator (Level 2)
                    │
                    └── user (Level 1)
```

#### Permission Checking

```typescript
// server/auth/index.ts
export async function checkPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const supabase = await createServerClient();
  
  const { data } = await supabase
    .from('user_profiles')
    .select(`
      role,
      role_permissions!inner(
        permissions!inner(name)
      )
    `)
    .eq('user_id', userId)
    .single();
    
  return data?.role_permissions?.some(
    rp => rp.permissions.name === permission
  ) ?? false;
}
```

#### React Permission Gate

```tsx
// components/auth/PermissionGate.tsx
export function PermissionGate({
  permission,
  children,
  fallback = null
}: PermissionGateProps) {
  const { user, hasPermission } = useAuth();
  
  if (!user || !hasPermission(permission)) {
    return fallback;
  }
  
  return children;
}
```

### Permission Matrix

| Permission | user | moderator | admin | super_admin |
|------------|:----:|:---------:|:-----:|:-----------:|
| repos.view | ✅ | ✅ | ✅ | ✅ |
| repos.create | ❌ | ❌ | ✅ | ✅ |
| repos.update | ❌ | ✅ | ✅ | ✅ |
| repos.delete | ❌ | ❌ | ✅ | ✅ |
| users.view | ❌ | ✅ | ✅ | ✅ |
| users.change_role | ❌ | ❌ | ❌ | ✅ |
| system.settings | ❌ | ❌ | ❌ | ✅ |

---

## Data Protection

### Row Level Security (RLS)

All tables have RLS enabled:

```sql
-- Enable RLS
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Public read access for analytics
CREATE POLICY "Public read access for repositories"
  ON repositories FOR SELECT
  USING (true);

-- Authenticated insert/update for admins
CREATE POLICY "Admin write access for repositories"
  ON repositories FOR INSERT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
```

### Sensitive Data Handling

| Data Type | Protection |
|-----------|------------|
| Passwords | Never stored (Supabase Auth handles) |
| API Keys | Environment variables only |
| Service Role Key | Server-side only, never exposed |
| GitHub Tokens | Server-side only |
| User Sessions | httpOnly cookies |

### Environment Variable Security

```bash
# Public (safe for client bundle)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Private (server-only, never in client bundle)
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # ⚠️ Full database access
INTERNAL_API_SECRET=xxx               # ⚠️ Internal endpoint protection
GITHUB_TOKEN=ghp_xxx                  # ⚠️ GitHub API access
```

---

## Input Validation

### Zod Schema Validation

All inputs are validated using Zod schemas:

```typescript
// contracts/repos.ts
import { z } from 'zod';

export const SearchRequestSchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .max(200, 'Query too long')
    .transform(s => s.trim()),
  language: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// In route handler
export async function GET(request: NextRequest) {
  const params = SearchRequestSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  
  if (!params.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', details: params.error.issues } },
      { status: 400 }
    );
  }
  
  // Safe to use params.data
}
```

### SQL Injection Prevention

```typescript
// ✅ CORRECT: Parameterized queries
const { data } = await supabase
  .from('repositories')
  .select('*')
  .eq('owner', owner)    // Automatically parameterized
  .eq('name', name);

// ❌ NEVER DO THIS: String concatenation
const query = `SELECT * FROM repos WHERE name = '${name}'`;  // SQL injection!
```

### XSS Prevention

React automatically escapes JSX:

```tsx
// ✅ Safe - React escapes this
<p>{userInput}</p>

// ⚠️ Dangerous - avoid unless absolutely necessary
<div dangerouslySetInnerHTML={{ __html: content }} />
```

---

## Security Headers

### Applied Headers

```typescript
// server/security/headers.ts
export function getSecurityHeaders(nonce: string): Record<string, string> {
  return {
    'Content-Security-Policy': buildCSP(nonce),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0', // Disabled for CSP
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}
```

### Content Security Policy

```
default-src 'self';
script-src 'self' 'nonce-xxx';
style-src 'self' 'unsafe-inline' 'nonce-xxx';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.github.com;
frame-src 'self';
frame-ancestors 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
```

### Header Explanations

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Restrictive policy | Prevent XSS, data injection |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Permissions-Policy` | Restrictive | Disable unused browser features |
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS |

---

## Rate Limiting

### Configuration

```typescript
// server/rateLimit/index.ts
interface RateLimitConfig {
  windowMs: number;      // Time window in ms
  max: number;           // Max requests per window
  keyGenerator: (req) => string;  // How to identify clients
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  api: { windowMs: 60_000, max: 100, keyGenerator: getClientIP },
  search: { windowMs: 60_000, max: 30, keyGenerator: getClientIP },
  auth: { windowMs: 300_000, max: 5, keyGenerator: getClientIP },
  internal: { windowMs: 60_000, max: 10, keyGenerator: () => 'internal' },
};
```

### Implementation

```typescript
// Using database-backed rate limiting
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = await createServerClient();
  
  // Atomic increment and check
  const { data } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_window_ms: config.windowMs,
    p_max: config.max
  });
  
  return {
    allowed: data.allowed,
    remaining: data.remaining,
    resetAt: data.reset_at
  };
}
```

---

## Audit Logging

### Logged Events

| Event | Severity | Logged Data |
|-------|----------|-------------|
| User login | INFO | User ID, IP, timestamp |
| Failed login | WARN | Email, IP, timestamp |
| Permission denied | WARN | User ID, resource, action |
| Admin action | INFO | User ID, action, details |
| Data modification | INFO | User ID, table, record ID |
| Rate limit hit | WARN | IP, endpoint |

### Audit Log Structure

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Logging Implementation

```typescript
// server/auth/audit.ts
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const supabase = await createServerClient();
  
  await supabase.from('audit_logs').insert({
    user_id: event.userId,
    action: event.action,
    resource_type: event.resourceType,
    resource_id: event.resourceId,
    details: event.details,
    ip_address: event.ipAddress,
    user_agent: event.userAgent,
  });
}
```

---

## Secure Development

### Code Review Checklist

- [ ] No hardcoded secrets or credentials
- [ ] All user inputs validated with Zod
- [ ] No raw SQL - use parameterized queries only
- [ ] Server-only modules marked correctly
- [ ] Sensitive data not logged
- [ ] Error messages don't expose internals
- [ ] Rate limiting applied to new endpoints
- [ ] Appropriate RLS policies for new tables

### Module Boundaries

Enforced by ESLint `import/no-restricted-paths`:

```javascript
// eslint.config.mjs
{
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        // Client cannot import server
        {
          target: './src/components/**',
          from: './src/server/**',
        },
        {
          target: './src/components/**',
          from: './src/dal/**',
        },
        // Core cannot import infrastructure
        {
          target: './src/core/**',
          from: './src/dal/**',
        },
      ],
    }],
  },
}
```

### Dependency Management

```bash
# Audit dependencies for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 - Critical | Active breach, data exposure | Immediate |
| P2 - High | Vulnerability with exploit | 24 hours |
| P3 - Medium | Potential vulnerability | 72 hours |
| P4 - Low | Minor security issue | 1 week |

### Response Procedures

#### 1. Detection

- Monitor audit logs
- Review error reports
- Check security headers
- Monitor rate limit hits

#### 2. Containment

```bash
# Emergency: Disable user
UPDATE user_profiles SET is_active = false WHERE user_id = 'xxx';

# Rotate compromised key
# Update environment variable and redeploy
```

#### 3. Investigation

```sql
-- Check audit logs for suspicious activity
SELECT * FROM audit_logs
WHERE user_id = 'xxx'
ORDER BY created_at DESC
LIMIT 100;

-- Check for unusual access patterns
SELECT ip_address, COUNT(*) as requests
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
ORDER BY requests DESC;
```

#### 4. Recovery

- Patch vulnerability
- Reset affected credentials
- Notify affected users (if required)
- Document incident

#### 5. Post-Incident

- Conduct post-mortem
- Update documentation
- Implement preventive measures

---

## Security Testing

### Recommended Tests

| Test Type | Frequency | Tools |
|-----------|-----------|-------|
| SAST (Static Analysis) | Every commit | ESLint security plugins |
| Dependency Audit | Weekly | `npm audit` |
| Penetration Testing | Quarterly | Manual + automated |
| Security Headers | Monthly | SecurityHeaders.com |

### Test Commands

```bash
# Run linter with security rules
npm run lint

# Check for vulnerabilities
npm audit

# Type checking (catches type-related issues)
npx tsc --noEmit
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Database](./DATABASE.md) - RLS policies
- [API Reference](./API.md) - Rate limits, auth
- [SECURITY.md](../SECURITY.md) - Security policy

---

**Maintained by [CognitionX Community](https://github.com/DrHazemAli/DiscoverX)**
