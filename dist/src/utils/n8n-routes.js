"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerN8nRoutes = void 0;
const registerN8nRoutes = (strapi, routes) => {
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
exports.registerN8nRoutes = registerN8nRoutes;
