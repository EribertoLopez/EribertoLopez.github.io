# Frontend

[Back to root](../README.md)

Next.js static site using **Pages Router** with auto-generated API clients from OpenAPI specification.

## Architecture

```
frontend/
├── pages/                  # Next.js Pages Router
│   ├── _app.tsx            # App wrapper (ChatWidget, global providers)
│   ├── _document.tsx       # Document customization
│   ├── index.tsx           # Home page
│   ├── contact/            # Contact page
│   ├── latest/             # Blog posts (index + [slug])
│   ├── mscs/               # MSCS program page
│   ├── projects/           # Projects (index + [slug])
│   ├── resume/             # Resume (index + [slug])
│   └── api/                # API routes (chat proxy)
├── components/             # React components
│   ├── common/             # Shared components
│   └── admin/              # Admin-specific components
├── generated/              # Auto-generated from OpenAPI (do not edit)
│   ├── apis/               # API client classes
│   ├── models/             # TypeScript interfaces
│   ├── services/           # Service layer
│   └── runtime.ts          # API runtime configuration
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and analytics
├── providers/              # React context providers
├── public/                 # Static assets
├── styles/                 # Global CSS
└── out/                    # Static export output
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `env.example` to `.env.local` and configure:

```bash
cp env.example .env.local
```

### 3. Run Development Server

```bash
npm run dev
```

Or from the project root:

```bash
npm run frontend:dev
```

## Environment Variables

All environment variables must be prefixed with `NEXT_PUBLIC_` to be available in the browser.

### API Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API endpoint | `http://localhost:4566/local` |
| `NEXT_PUBLIC_ENVIRONMENT` | Yes | Environment name | `local`, `dev`, `prod` |
| `NEXT_PUBLIC_REQUIRES_AUTH` | No | Enable authentication | `true` |

### Analytics

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_HOTJAR_SITE_ID` | No | Hotjar tracking ID |
| `NEXT_PUBLIC_GA_ID` | No | Google Analytics ID |


### Example `.env.local` for Local Development

```bash
NEXT_PUBLIC_API_URL=http://5a1vweafmy.execute-api.localhost.localstack.cloud:4566/local
NEXT_PUBLIC_ENVIRONMENT=local
NEXT_PUBLIC_REQUIRES_AUTH=true

# Analytics (optional for local)
NEXT_PUBLIC_HOTJAR_SITE_ID=
NEXT_PUBLIC_GA_ID=
```

## Generated API Clients

The `generated/` directory contains TypeScript code auto-generated from the OpenAPI specification. **Do not edit these files directly** - they are overwritten when running code generation.

### Regenerating Clients

From the project root:

```bash
npm run codegen
```

This regenerates both frontend and backend code from `codegen/openapi.yaml`.

### Using Generated APIs

```typescript
import { Configuration } from "@/generated";

// Configure the API client
const config = new Configuration({
  basePath: process.env.NEXT_PUBLIC_API_URL,
});

// Use generated API clients with the configuration
```

### Generated Structure

| Directory | Contents |
|-----------|----------|
| `generated/apis/` | API client classes (one per OpenAPI tag) |
| `generated/models/` | TypeScript interfaces for request/response objects |
| `generated/services/` | Service interfaces for dependency injection |
| `generated/runtime.ts` | Base configuration and fetch wrapper |

## Static Export

The frontend is configured for static export to S3/CloudFront:

```bash
npm run build
```

This generates static HTML/CSS/JS in the `out/` directory.

### Build Output

```
out/
├── _next/           # Next.js chunks and assets
├── index.html       # Home page
├── contact.html     # Contact page
├── latest.html      # Blog posts listing
├── mscs.html        # MSCS program
├── projects.html    # Projects listing
├── resume.html      # Resume listing
└── *.png, *.jpg     # Static images
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build static export |
| `npm run start` | Start production server (for testing) |
| `npm run lint` | Run ESLint |

## Styling

- **Tailwind CSS** for utility-first styling
- **CSS Variables** for theming (see `styles/globals.css`)
- **shadcn/ui** components (configured in `components.json`)

## Authentication

Authentication is handled via the `use-admin-auth` hook and `AuthProvider`. See [`docs/AUTH-README.md`](docs/AUTH-README.md) for details.

## Deployment

The frontend is deployed to AWS S3 + CloudFront via CDK:

```bash
# From project root
npm run deploy:frontend
```

This:
1. Builds the static export
2. Uploads to S3
3. Invalidates CloudFront cache
