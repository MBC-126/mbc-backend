import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::daily-menu.daily-menu' as any, ({ strapi }) => ({
  async find(ctx) {
    // Ajouter le filtre isActive = true
    const filters = ctx.query.filters ? { ...(ctx.query.filters as any) } : {};
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
    const filters = ctx.query.filters ? { ...(ctx.query.filters as any) } : {};
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
