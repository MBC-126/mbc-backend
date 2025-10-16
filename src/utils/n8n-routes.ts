type RouteDef = {
  method: string;
  path: string;
  handler: (ctx: any) => Promise<any> | any;
  config?: Record<string, any>;
};

export const registerN8nRoutes = (strapi: any, routes: RouteDef[]) => {
  const secured = routes.map((r) => ({
    ...r,
    config: {
      auth: false,
      policies: ['global::require-api-token'],
      ...(r.config || {}),
    },
  }));
  strapi.server.routes(secured);
};

