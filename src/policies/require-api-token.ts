/**
 * Policy that requires a valid Strapi API Token (Admin API token)
 * Accepts Authorization: Bearer <token>
 * Optionally enforces read/write based on HTTP method and token type.
 */

const METHOD_TO_ACCESS: Record<string, 'read-only' | 'write-only' | 'full-access'> = {
  GET: 'read-only',
  HEAD: 'read-only',
  OPTIONS: 'read-only',
  POST: 'write-only',
  PUT: 'write-only',
  PATCH: 'write-only',
  DELETE: 'write-only',
};

export default async (policyContext: any, _config: any, { strapi }: any) => {
  try {
    const req = policyContext.request || policyContext;
    const authHeader: string | undefined = (req.headers && (req.headers['authorization'] as any)) || (policyContext.headers && (policyContext.headers['authorization'] as any));
    const method = (req.method || 'GET').toUpperCase();
    const url = req.url || req.originalUrl || '';
    try { strapi.log.debug(`[require-api-token] ${method} ${url}`); } catch {}
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      console.warn('[require-api-token] Missing or invalid Authorization header');
      try { strapi.log.warn('[require-api-token] Missing or invalid Authorization header'); } catch {}
      return policyContext.unauthorized ? policyContext.unauthorized() : false;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      console.warn('[require-api-token] Empty Bearer token');
      try { strapi.log.warn('[require-api-token] Empty Bearer token'); } catch {}
      return policyContext.unauthorized ? policyContext.unauthorized() : false;
    }

    // Validate token using Strapi admin api-token service
    // @ts-ignore
    const apiTokenService = strapi.admin.services['api-token'];
    const hashed = apiTokenService.hash(token);
    try { strapi.log.debug(`[require-api-token] hash:${hashed?.slice(0, 8)}…`); } catch {}
    const apiToken = await apiTokenService.getBy({ accessKey: hashed });
    if (!apiToken) {
      console.warn('[require-api-token] API token not found');
      try { strapi.log.warn('[require-api-token] API token not found'); } catch {}
      return policyContext.unauthorized ? policyContext.unauthorized() : false;
    }

    // Enforce access type based on HTTP method
    const needed = METHOD_TO_ACCESS[method] || 'read-only';

    const type = (apiToken as any).type as string | undefined;
    const allowedTypes = needed === 'write-only' ? ['write-only', 'full-access'] : ['read-only', 'full-access'];
    const allowed = !!type && allowedTypes.includes(type);
    try { strapi.log.debug(`[require-api-token] type:${type} need:${needed} allowed:${allowed}`); } catch {}

    if (!allowed) {
      console.warn('[require-api-token] Token type not allowed for this method');
      try { strapi.log.warn('[require-api-token] Token type not allowed for this method'); } catch {}
      return policyContext.forbidden ? policyContext.forbidden() : false;
    }

    // Attach token info if needed downstream
    policyContext.state = policyContext.state || {};
    policyContext.state.apiToken = apiToken;

    return true;
  } catch (e: any) {
    try { strapi.log.error(`[require-api-token] Error: ${e?.message || e}`); } catch {}
    return policyContext.unauthorized ? policyContext.unauthorized() : false;
  }
};
