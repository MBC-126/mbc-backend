# n8n Machine-to-Machine Endpoints

These endpoints are intended for n8n workflows running on the same Docker network (`app-net`). They are protected with a Strapi API Token via the `global::require-api-token` policy and do not require a user JWT.

- Base (internal from n8n): `http://strapi:1337/api`
- Auth header: `Authorization: Bearer <STRAPI_API_TOKEN>`
- Token type:
  - GET → Read-only or Full access
  - POST/PUT/PATCH/DELETE → Write-only or Full access

## Endpoints

### Carpools
- GET `/carpools/to-remind?windowMinutes=2&reminderType=1h-before`
- POST `/carpools/:id/mark-reminder-sent`
  - Body JSON: `{ "reminderType": "1h-before" }`
- DELETE `/carpools/cleanup`

### Reservations
- GET `/reservations/tomorrow`

### Announcements
- GET `/announcements/expiring?days=3`

### Notifications
- POST `/notifications/send`
  - Body JSON: `{ "userId": 1, "title": "...", "body": "...", "data": {"k":"v"} }`
- DELETE `/notifications/cleanup`

## Usage in n8n (HTTP Request node)
- Authentication: None
- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json` for POST/PUT/PATCH

## Adding new n8n endpoints
- Prefer programmatic registration using the helper to ensure consistent protection:

```ts
// src/index.ts
import { registerN8nRoutes } from './utils/n8n-routes';
registerN8nRoutes(strapi, [
  { method: 'GET', path: '/api/your/path', handler: async (ctx) => {/* ... */} },
]);
```

- Or, if you add a route file, set:

```ts
config: { auth: false, policies: ['global::require-api-token'] }
```

This guarantees that all n8n endpoints consistently use API Token authentication and skip user JWT auth.

