# DiscoverX

<div align="center">

![DiscoverX](https://img.shields.io/badge/DiscoverX-GitHub_Analytics-blue?style=for-the-badge)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

**A powerful GitHub repository analytics and discovery platform**

[Demo](https://github.com/DrHazemAli/DiscoverX) · [Documentation](./docs/) · [Report Bug](https://github.com/DrHazemAli/DiscoverX/issues) · [Request Feature](https://github.com/DrHazemAli/DiscoverX/issues)

</div>

---

## 🚀 Overview

DiscoverX is a comprehensive GitHub repository analytics platform that helps developers and teams discover, compare, and evaluate open-source projects. It provides health scores, historical metrics, rankings, and detailed insights to make informed decisions about which repositories to use or contribute to.

![DiscoverX Banner](https://raw.githubusercontent.com/DrHazemAli/DiscoverX/main/assets/banner.png)


### Key Features

- 🔍 **Smart Search** - Find repositories with advanced filtering and fuzzy search
- 📊 **Health Scores** - Multi-dimensional scoring across activity, community, maintenance, popularity, and quality
- 📈 **Time-Series Analytics** - Track repository metrics over time
- 🏆 **Rankings** - Daily, weekly, and monthly rankings by various criteria
- ⚖️ **Comparison** - Side-by-side repository comparisons
- 🔄 **Real-time Updates** - Background job processing for fresh data
- 🌙 **Dark Mode** - Beautiful UI with light and dark themes
- 🔐 **Secure** - Row-level security, RBAC, and comprehensive security headers

## 📚 Documentation

Comprehensive documentation is available in the [docs/](./docs/) directory:

- [Getting Started](./docs/GETTING_STARTED.md) - Installation and setup guide
- [Architecture](./docs/ARCHITECTURE.md) - System design and patterns
- [Database](./docs/DATABASE.md) - Schema, relations, and migrations
- [API Reference](./docs/API.md) - REST API documentation
- [Security](./docs/SECURITY.md) - Security practices and guidelines
- [Contributing](./docs/CONTRIBUTING.md) - How to contribute

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **UI Components** | [Radix UI](https://www.radix-ui.com/) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Auth** | [Supabase Auth](https://supabase.com/auth) |
| **State Management** | [TanStack React Query](https://tanstack.com/query) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Validation** | [Zod](https://zod.dev/) |

## ⚡ Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account (or local Supabase CLI)

### Installation

```bash
# Clone the repository
git clone https://github.com/DrHazemAli/DiscoverX.git
cd DiscoverX

# Install dependencies
npm install

# Copy environment example
cp env.example .env.local

# Configure your environment variables
# Edit .env.local with your Supabase credentials

# Run database migrations
npx supabase db push

# Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Protected dashboard
│   │   ├── (main)/            # Public pages
│   │   └── api/               # API routes
│   ├── core/                   # Domain logic (pure functions)
│   │   ├── scoring/           # Health score algorithms
│   │   ├── ranking/           # Ranking computations
│   │   └── alternatives/      # Alternative suggestions
│   ├── application/           # Use cases & orchestration
│   ├── dal/                   # Data access layer
│   ├── server/                # Server-only adapters
│   ├── components/            # React components
│   ├── lib/                   # Shared utilities
│   └── contracts/             # Zod schemas & DTOs
├── supabase/
│   └── migrations/            # Database migrations
└── docs/                      # Documentation
```

## 📊 Scoring System

DiscoverX evaluates repositories across 5 dimensions:

| Dimension | Weight | Factors |
|-----------|--------|---------|
| **Activity** | 25% | Commit frequency, PR activity, velocity |
| **Community** | 20% | Contributors, discussions, engagement |
| **Maintenance** | 20% | Issue response time, release frequency |
| **Popularity** | 15% | Stars, forks, watchers growth |
| **Quality** | 20% | Documentation, code quality signals |

## 🔒 Security

DiscoverX implements comprehensive security measures:

- **Row Level Security (RLS)** - Database-level access control
- **RBAC** - Role-based permissions (user, moderator, admin, super_admin)
- **Security Headers** - CSP, HSTS, X-Frame-Options, etc.
- **Input Validation** - Zod schemas for all inputs
- **Parameterized Queries** - No SQL injection vectors
- **Secure Sessions** - Supabase Auth with httpOnly cookies

See [SECURITY.md](./SECURITY.md) for security policy and vulnerability reporting.

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - The open source Firebase alternative
- [Radix UI](https://www.radix-ui.com/) - Accessible UI components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

<div align="center">

**Maintained by [CognitionX Community](https://github.com/DrHazemAli/DiscoverX)**

⭐ Star us on GitHub — it helps!

[Report an Issue](https://github.com/DrHazemAli/DiscoverX/issues) · [Request a Feature](https://github.com/DrHazemAli/DiscoverX/issues)

</div>
