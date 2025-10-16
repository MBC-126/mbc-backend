/**
 * Health check controller
 * Si l'endpoint répond, Strapi est opérationnel
 */

export default {
  async check(ctx: any) {
    // Si on arrive ici, Strapi est up
    // Test DB optionnel pour monitoring plus poussé
    ctx.body = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
};
