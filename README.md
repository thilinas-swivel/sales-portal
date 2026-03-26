# LeadFlow — Sales Portal

Internal sales management platform for SwivelTech. Provides a unified portal for sales administrators, sales executives, callers, and leadership to manage leads, pipelines, partners, and CRM data via Pipedrive integration.

## Tech Stack

| Layer            | Technology                               |
| ---------------- | ---------------------------------------- |
| Framework        | Next.js 16 (App Router)                  |
| Language         | TypeScript (strict mode)                 |
| Styling          | Tailwind CSS v4                          |
| Authentication   | NextAuth v5 + Microsoft Entra ID (SSO)   |
| Database         | Supabase (PostgreSQL)                    |
| CRM              | Pipedrive API                            |
| Containerisation | Docker (multi-stage, standalone)         |
| Hosting          | Azure Web App (Linux container)          |
| Registry         | Azure Container Registry (`leadflowacr`) |
| CI/CD            | GitHub Actions                           |

## Portals

The repository contains three separate applications:

| Portal                                | Path                      | Audience                                  |
| ------------------------------------- | ------------------------- | ----------------------------------------- |
| **Sales Portal** (Next.js)            | `src/`                    | All roles — served at `/admin`, `/caller` |
| **LeadFlow Caller** (Vite/React)      | `LeadFlow - Caller/`      | External/internal callers (standalone)    |
| **LeadFlow Super Admin** (Vite/React) | `LeadFlow - Super Admin/` | Super administrators (standalone)         |

## Roles & Permissions

Six system roles are seeded in the database:

| Role                   | Description                              |
| ---------------------- | ---------------------------------------- |
| `super_admin`          | Full access to everything                |
| `sales_admin`          | Manage users, roles, pipelines, partners |
| `sales_executive`      | Access assigned pipelines and deals      |
| `leadership_executive` | Read-only dashboards and reporting       |
| `internal_caller`      | Submit leads via caller interface        |
| `external_caller`      | Submit leads (external partner callers)  |

Super admins can create custom roles, assign permissions per role, and grant or restrict individual user permissions. Sales executives can only access pipelines explicitly assigned to them.

## Getting Started

### Prerequisites

- Node.js 22+
- A `.env.local` file (copy from `.env.example`)

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in values — see Environment Variables section below

# Start development server (with Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Sign in with your **SwivelTech Microsoft account**. Your role is assigned by a super admin after first login.

## Scripts

| Command              | Description                       |
| -------------------- | --------------------------------- |
| `npm run dev`        | Start dev server with Turbopack   |
| `npm run build`      | Create production build           |
| `npm start`          | Start production server           |
| `npm run lint`       | Run ESLint                        |
| `npm run lint:fix`   | Run ESLint with auto-fix          |
| `npm run format`     | Format code with Prettier         |
| `npm run type-check` | Run TypeScript compiler check     |
| `npm run validate`   | Type-check + lint (full pipeline) |

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Pipedrive CRM
PIPEDRIVE_API_TOKEN=
PIPEDRIVE_COMPANY_DOMAIN=

# NextAuth
AUTH_SECRET=
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true          # Required on Azure App Service

# Microsoft Entra ID (for SSO)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

> **Never commit `.env.local`** — it is in `.gitignore`. Runtime secrets on Azure are set as Application Settings on the Web App, not stored in the image.

## Project Structure

```
src/
├── app/
│   ├── admin/                # Admin portal (/admin)
│   │   ├── users/            # User management (RBAC)
│   │   ├── roles/            # Role & permission management
│   │   ├── deals/            # Deal pipeline views
│   │   ├── partners/         # Partner management
│   │   ├── pipelines/        # Pipeline configuration
│   │   ├── prospects/        # Prospect management
│   │   └── settings/         # Application settings
│   ├── caller/               # Caller portal (/caller)
│   │   ├── contacts/
│   │   ├── new-lead/
│   │   ├── notifications/
│   │   ├── submissions/
│   │   └── profile/
│   ├── api/                  # API routes (auth, pipedrive, partners)
│   └── login/                # Sign-in page
├── components/               # Shared UI components
├── contexts/                 # React context providers (auth, theme, date)
├── hooks/                    # Custom React hooks
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   ├── rbac.ts               # Role-based access control helpers
│   ├── supabase.ts           # Supabase client
│   ├── pipedrive.ts          # Pipedrive API client
│   ├── constants.ts          # Permission definitions (28 permissions)
│   └── supabase/
│       ├── server.ts         # Server-side Supabase client
│       └── user-actions.ts   # User/role/permission CRUD
└── types/                    # Shared TypeScript types
```

## Deployment

### Azure Infrastructure

| Resource           | Name                       | Region         |
| ------------------ | -------------------------- | -------------- |
| Resource Group     | `rg-leadflow`              | Australia East |
| Container Registry | `leadflowacr`              | Australia East |
| App Service Plan   | `leadflow-plan` (Linux B2) | Australia East |
| Web App            | `leadflow-sales-portal`    | Australia East |

### CI/CD Pipeline

Pushes to `main` automatically:

1. Build Docker image (multi-stage, Next.js standalone)
2. Push to `leadflowacr.azurecr.io/sales-portal:latest`
3. Deploy to `leadflow-sales-portal` Azure Web App

### Required GitHub Secrets

Go to **GitHub → Settings → Secrets and variables → Actions** and add:

| Secret                  | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `REGISTRY_LOGIN_SERVER` | `leadflowacr.azurecr.io`                        |
| `REGISTRY_USERNAME`     | ACR admin username                              |
| `REGISTRY_PASSWORD`     | ACR admin password                              |
| `AZURE_WEBAPP_NAME`     | `leadflow-sales-portal`                         |
| `AZURE_CREDENTIALS`     | JSON from `az ad sp create-for-rbac --sdk-auth` |

### Required GitHub Variables (non-secret, baked into image at build time)

| Variable                        | Value                |
| ------------------------------- | -------------------- |
| `NEXT_PUBLIC_APP_URL`           | Production URL       |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key    |

### Manual First Deploy

If no image exists in ACR yet (e.g. before GitHub Actions has run):

```bash
az acr login --name leadflowacr
docker build -t leadflowacr.azurecr.io/sales-portal:latest .
docker push leadflowacr.azurecr.io/sales-portal:latest
az webapp restart --name leadflow-sales-portal --resource-group rg-leadflow
```

### Entra ID Redirect URI

Add the following redirect URI to the Microsoft Entra app registration:

```
https://<your-domain>/api/auth/callback/microsoft-entra-id
```
