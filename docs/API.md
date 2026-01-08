# API Reference

This document describes the REST API endpoints for DiscoverX.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Search](#search)
  - [Repositories](#repositories)
  - [Rankings](#rankings)
  - [Compare](#compare)
- [Response Formats](#response-formats)

---

## Overview

### Base URL

```
Production: https://your-domain.com/api/v1
Development: http://localhost:3000/api/v1
```

### Common Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-Request-ID` | Unique request identifier (returned in response) |

### Versioning

The API is versioned via URL path (`/api/v1/`). Breaking changes will increment the version number.

---

## Authentication

Most endpoints are **public** and don't require authentication. Protected endpoints require a Supabase session.

### Public Endpoints (No Auth)

- `GET /api/v1/search`
- `GET /api/v1/repos/:owner/:name`
- `GET /api/v1/repos/:owner/:name/timeseries`
- `GET /api/v1/repos/:owner/:name/alternatives`
- `GET /api/v1/rankings`
- `GET /api/v1/compare`

### Protected Endpoints (Require Auth)

- `POST /api/v1/reports` - Create reports
- `DELETE /api/v1/reports/:id` - Delete reports
- Dashboard endpoints

### Internal Endpoints (Server-to-Server)

Protected by `x-internal-secret` header:

```bash
curl -X POST https://your-domain.com/api/internal/jobs/run \
  -H "x-internal-secret: YOUR_SECRET" \
  -H "Content-Type: application/json"
```

---

## Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Public API | 100 requests | 1 minute |
| Search | 30 requests | 1 minute |
| Internal | 10 requests | 1 minute |

When rate limited, the API returns:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Validation Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "issues": [
        {
          "path": ["query"],
          "message": "String must contain at least 1 character"
        }
      ]
    }
  }
}
```

---

## Endpoints

### Search

Search for repositories with filters.

#### `GET /api/v1/search`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query |
| `language` | string | No | - | Filter by language |
| `minStars` | number | No | - | Minimum stars |
| `maxStars` | number | No | - | Maximum stars |
| `sort` | string | No | `relevance` | Sort by: `relevance`, `stars`, `updated`, `score` |
| `order` | string | No | `desc` | Order: `asc`, `desc` |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Results per page (max 100) |

**Example Request:**

```bash
curl "https://your-domain.com/api/v1/search?q=react&language=TypeScript&minStars=1000&sort=stars&limit=10"
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "facebook/react",
      "description": "A declarative, efficient, and flexible JavaScript library...",
      "language": "JavaScript",
      "starsCount": 220000,
      "forksCount": 45000,
      "overallScore": 95.5,
      "updatedAt": "2026-01-09T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "took": 45,
    "requestId": "req_abc123"
  }
}
```

---

### Repositories

Get detailed repository information.

#### `GET /api/v1/repos/:owner/:name`

Get repository profile with scores.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `owner` | string | Repository owner |
| `name` | string | Repository name |

**Example Request:**

```bash
curl "https://your-domain.com/api/v1/repos/facebook/react"
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "githubId": 10270250,
    "owner": "facebook",
    "name": "react",
    "fullName": "facebook/react",
    "description": "A declarative, efficient, and flexible JavaScript library...",
    "homepageUrl": "https://react.dev",
    "language": "JavaScript",
    "topics": ["javascript", "library", "react", "ui"],
    "starsCount": 220000,
    "forksCount": 45000,
    "watchersCount": 6500,
    "openIssuesCount": 1200,
    "isFork": false,
    "isArchived": false,
    "isTemplate": false,
    "hasWiki": true,
    "hasIssues": true,
    "hasDiscussions": true,
    "licenseKey": "MIT",
    "licenseName": "MIT License",
    "githubCreatedAt": "2013-05-24T16:15:54Z",
    "githubUpdatedAt": "2026-01-09T12:00:00Z",
    "githubPushedAt": "2026-01-09T10:30:00Z",
    "lastSyncedAt": "2026-01-09T12:00:00Z",
    "score": {
      "overall": 95.5,
      "activity": 92.0,
      "community": 98.0,
      "maintenance": 94.0,
      "popularity": 99.0,
      "quality": 93.0,
      "breakdown": {
        "activity": {
          "normalizedScore": 92.0,
          "factors": [
            {"name": "Recent Commits", "rawValue": 150, "score": 95, "weight": 0.4},
            {"name": "PR Activity", "rawValue": 80, "score": 88, "weight": 0.3}
          ]
        }
      },
      "algorithmVersion": "1.0.0",
      "computedAt": "2026-01-09T00:00:00Z"
    }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

---

#### `GET /api/v1/repos/:owner/:name/timeseries`

Get historical metrics for charts.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `days` | number | No | 30 | Number of days (max 365) |
| `metrics` | string | No | all | Comma-separated: `stars,forks,issues,commits` |

**Example Request:**

```bash
curl "https://your-domain.com/api/v1/repos/facebook/react/timeseries?days=30&metrics=stars,forks"
```

**Response:**

```json
{
  "data": {
    "repository": {
      "id": "uuid",
      "fullName": "facebook/react"
    },
    "period": {
      "start": "2025-12-10",
      "end": "2026-01-09",
      "days": 30
    },
    "series": {
      "stars": [
        {"date": "2025-12-10", "value": 219500},
        {"date": "2025-12-11", "value": 219550},
        ...
      ],
      "forks": [
        {"date": "2025-12-10", "value": 44800},
        {"date": "2025-12-11", "value": 44820},
        ...
      ]
    },
    "summary": {
      "stars": {"start": 219500, "end": 220000, "change": 500, "changePercent": 0.23},
      "forks": {"start": 44800, "end": 45000, "change": 200, "changePercent": 0.45}
    }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

---

#### `GET /api/v1/repos/:owner/:name/alternatives`

Get similar/alternative repositories.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 10 | Number of alternatives (max 50) |

**Example Request:**

```bash
curl "https://your-domain.com/api/v1/repos/facebook/react/alternatives?limit=5"
```

**Response:**

```json
{
  "data": {
    "repository": {
      "id": "uuid",
      "fullName": "facebook/react"
    },
    "alternatives": [
      {
        "id": "uuid",
        "fullName": "vuejs/vue",
        "description": "Vue.js is a progressive, incrementally-adoptable JavaScript framework...",
        "language": "TypeScript",
        "starsCount": 205000,
        "overallScore": 94.2,
        "similarity": 0.85,
        "comparisonHighlights": {
          "advantages": ["TypeScript support", "Smaller bundle size"],
          "disadvantages": ["Smaller ecosystem"]
        }
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

---

### Rankings

Get repository rankings.

#### `GET /api/v1/rankings`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `weekly` | `daily`, `weekly`, `monthly` |
| `type` | string | No | `overall` | `overall`, `activity`, `community`, `maintenance`, `popularity`, `quality` |
| `language` | string | No | - | Filter by language |
| `asOf` | string | No | latest | Date (YYYY-MM-DD) |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Results per page (max 100) |

**Example Request:**

```bash
curl "https://your-domain.com/api/v1/rankings?period=weekly&type=overall&language=TypeScript&limit=10"
```

**Response:**

```json
{
  "data": {
    "period": "weekly",
    "type": "overall",
    "asOf": "2026-01-06",
    "language": "TypeScript",
    "rankings": [
      {
        "rank": 1,
        "previousRank": 1,
        "rankChange": 0,
        "repository": {
          "id": "uuid",
          "fullName": "microsoft/TypeScript",
          "description": "TypeScript is a superset of JavaScript...",
          "starsCount": 95000
        },
        "score": 97.5
      },
      {
        "rank": 2,
        "previousRank": 3,
        "rankChange": 1,
        "repository": {
          "id": "uuid",
          "fullName": "microsoft/vscode",
          "description": "Visual Studio Code",
          "starsCount": 155000
        },
        "score": 96.8
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 500,
    "totalPages": 50
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

---

### Compare

Compare multiple repositories side by side.

#### `GET /api/v1/compare`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repos` | string | Yes | Comma-separated repo full names (max 5) |

**Example Request:**

```bash
curl "https://your-domain.com/api/v1/compare?repos=facebook/react,vuejs/vue,angular/angular"
```

**Response:**

```json
{
  "data": {
    "repositories": [
      {
        "id": "uuid",
        "fullName": "facebook/react",
        "description": "A declarative, efficient...",
        "language": "JavaScript",
        "starsCount": 220000,
        "forksCount": 45000,
        "score": {
          "overall": 95.5,
          "activity": 92.0,
          "community": 98.0,
          "maintenance": 94.0,
          "popularity": 99.0,
          "quality": 93.0
        }
      },
      {
        "id": "uuid",
        "fullName": "vuejs/vue",
        "description": "Vue.js is a progressive...",
        "language": "TypeScript",
        "starsCount": 205000,
        "forksCount": 33000,
        "score": {
          "overall": 94.2,
          "activity": 88.0,
          "community": 96.0,
          "maintenance": 95.0,
          "popularity": 98.0,
          "quality": 94.0
        }
      }
    ],
    "comparison": {
      "winner": {
        "overall": "facebook/react",
        "activity": "facebook/react",
        "community": "facebook/react",
        "maintenance": "vuejs/vue",
        "popularity": "facebook/react",
        "quality": "vuejs/vue"
      },
      "insights": [
        "React has higher community engagement",
        "Vue has better maintenance practices",
        "Both have excellent quality scores"
      ]
    }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

---

## Response Formats

### Pagination

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Metadata

```json
{
  "meta": {
    "requestId": "req_abc123",
    "took": 45,
    "cached": false
  }
}
```

### Date/Time Formats

All dates are in ISO 8601 format:
- Full datetime: `2026-01-09T12:00:00Z`
- Date only: `2026-01-09`

### Scores

All scores are on a 0-100 scale with 2 decimal places.

---

## SDK Usage

### JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch(
  'https://your-domain.com/api/v1/search?q=react&limit=10'
);
const data = await response.json();

// Using the API client
import { apiClient } from '@/lib/api/client';

const { data } = await apiClient.search({
  query: 'react',
  language: 'TypeScript',
  limit: 10
});
```

### cURL Examples

```bash
# Search
curl "https://api.discoverx.com/v1/search?q=react"

# Get repository
curl "https://api.discoverx.com/v1/repos/facebook/react"

# Get rankings
curl "https://api.discoverx.com/v1/rankings?period=weekly"

# Compare repositories
curl "https://api.discoverx.com/v1/compare?repos=facebook/react,vuejs/vue"
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Database](./DATABASE.md) - Data model
- [Security](./SECURITY.md) - Security practices

---

**Maintained by [CognitionX Community](https://github.com/DrHazemAli/DiscoverX)**
