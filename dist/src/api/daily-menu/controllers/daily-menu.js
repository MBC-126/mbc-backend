"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::daily-menu.daily-menu', ({ strapi }) => ({
    async find(ctx) {
        // Ajouter le filtre isActive = true
        const filters = ctx.query.filters ? { ...ctx.query.filters } : {};
        ctx.query = {
            ...ctx.query,
            filters: {
                ...filters,
                isActive: true
            }
        };
        const { data, meta } = await super.find(ctx);
        return { data, meta };
    },
    async findOne(ctx) {
        const { id } = ctx.params;
        // Ajouter le filtre isActive = true
        const filters = ctx.query.filters ? { ...ctx.query.filters } : {};
        ctx.query = {
            ...ctx.query,
            filters: {
                ...filters,
                isActive: true
            }
        };
        const { data, meta } = await super.findOne(ctx);
        return { data, meta };
    }
}));
