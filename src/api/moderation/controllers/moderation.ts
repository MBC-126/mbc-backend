'use strict';

export default {
  // Report content for moderation
  async report(ctx) {
    const { data } = ctx.request.body;
    const userId = ctx.state.user?.id;

    // Validate required fields
    if (!data.targetType || !data.targetId) {
      return ctx.badRequest('targetType and targetId are required');
    }

    if (!['announcement', 'carpool'].includes(data.targetType)) {
      return ctx.badRequest('Invalid targetType');
    }

    // Check if target content exists
    try {
      if (data.targetType === 'announcement') {
        await strapi.entityService.findOne('api::announcement.announcement', data.targetId);
      } else if (data.targetType === 'carpool') {
        await strapi.entityService.findOne('api::carpool.carpool', data.targetId);
      }
    } catch (error) {
      return ctx.notFound('Target content not found');
    }

    // Create the report directly using entityService
    const report = await strapi.entityService.create('api::moderation-report.moderation-report', {
      data: {
        targetType: data.targetType,
        targetId: data.targetId,
        reporter: userId,
        reason: data.reason || null,
        status: 'pending'
      }
    });

    ctx.send({ data: report });
  },

  // Get moderation queue
  async queue(ctx) {
    const { reportId } = ctx.query;
    
    const result = await strapi.service('api::moderation-report.moderation-report').getQueue(reportId);
    
    if (!result) {
      return ctx.send({ data: null });
    }

    ctx.send({ data: result });
  },

  // Keep content
  async keep(ctx) {
    const { reportId } = ctx.params;
    const moderatorId = ctx.state.user?.id;

    try {
      const report = await strapi.service('api::moderation-report.moderation-report').keep(reportId, moderatorId);
      
      // Log the action
      console.log(`Moderation action: KEEP - Report ${reportId} by user ${moderatorId}`);
      
      ctx.send({ data: report });
    } catch (error) {
      console.error('Erreur keep report:', error);
      return ctx.badRequest('Failed to keep content');
    }
  },

  // Remove content
  async remove(ctx) {
    const { reportId } = ctx.params;
    const moderatorId = ctx.state.user?.id;

    try {
      const report = await strapi.service('api::moderation-report.moderation-report').remove(reportId, moderatorId);
      
      // Log the action
      console.log(`Moderation action: REMOVE - Report ${reportId} by user ${moderatorId}`);
      
      ctx.send({ data: report });
    } catch (error) {
      console.error('Erreur remove report:', error);
      return ctx.badRequest('Failed to remove content');
    }
  }
};