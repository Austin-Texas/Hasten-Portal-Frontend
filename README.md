# HASTEN Portal Frontend

Private enterprise portal for HASTEN Cargo operations, dispatch, fleet, finance, drivers, customers, brokers, and external partners.

## Architecture

- Frontend: React 18 + Vite
- Routing: React Router
- Data fetching: HASTEN Core API
- Backend repository: `Austin-Texas/hasten-core-api`
- Portal repository: `Austin-Texas/Hasten-Portal-Frontend`
- Production API: `https://ha-core.hastenload.com/api`

Base44 is not part of the supported architecture. The portal must communicate only with the HASTEN Core API.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variable:

```env
VITE_CORE_API_URL=https://ha-core.hastenload.com/api
```

Do not commit API secrets, database credentials, private keys, or production access tokens. Browser authentication tokens are supplied at runtime by the HASTEN authentication flow.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Development and deployment policy

1. Inspect and change the GitHub repository first.
2. Validate the code before deployment.
3. Commit completed work to GitHub.
4. Deploy the validated GitHub revision to the portal server.
5. Never reset or overwrite persistent backend data during a frontend deployment.

## Core API integration

The shared client is located at `src/lib/coreApiClient.js`. New portal features should use this client instead of calling external backend platforms directly.

The initial partner portal routes are expected under:

- `POST /partner/load-requests`
- `POST /partner/document-requests`
- `POST /partner/invoice-disputes`
- `GET /partner/portal`
- `POST /notifications`

The corresponding endpoints must exist in `hasten-core-api` before production activation.
