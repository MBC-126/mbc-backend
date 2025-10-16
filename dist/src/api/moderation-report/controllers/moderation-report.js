"use strict";
/**
 * moderation-report controller
 */
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::moderation-report.moderation-report', ({ strapi }) => ({
    // Override create to add anti-spam logic
    async create(ctx) {
        var _a;
        const { data } = ctx.request.body;
        const userId = (_a = ctx.state.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return ctx.unauthorized('Authentication required');
        }
        // Check for existing pending report from same user for same content in last 24h
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingReport = await strapi.entityService.findMany('api::moderation-report.moderation-report', {
            filters: {
                reporter: userId,
                targetType: data.targetType,
                targetId: data.targetId,
                status: 'pending',
                createdAt: {
                    $gte: twentyFourHoursAgo.toISOString()
                }
            }
        });
        if (existingReport.length > 0) {
            // Return existing report (idempotence)
            return { data: existingReport[0] };
        }
        // Create new report
        const report = await strapi.entityService.create('api::moderation-report.moderation-report', {
            data: {
                ...data,
                reporter: userId
            }
        });
        // Send push notification to all moderators
        await strapi.service('api::moderation-report.moderation-report').notifyModerators(report);
        return { data: report };
    }
}));
