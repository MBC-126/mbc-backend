/**
 * moderation-report service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::moderation-report.moderation-report', ({ strapi }) => ({
  // Send push notification to all moderators
  async notifyModerators(report: any) {
    try {
      // Get all moderators (users with isModerator=true or isAppAdmin=true)
      const moderators = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          $or: [
            { isModerator: true },
            { isAppAdmin: true }
          ]
        }
      });

      // Send notification to each moderator
      for (const moderator of moderators as any[]) {
        // Get device tokens for this moderator
        const tokens = await strapi.entityService.findMany('api::device-token.device-token', {
          filters: {
            user: moderator.id,
            enabled: true
          }
        });

        if ((tokens as any[]).length > 0) {
          for (const token of tokens as any[]) {
            try {
              await strapi.plugins['fcm'].services.fcm.send({
                token: token.token,
                notification: {
                  title: 'Signalement de contenu',
                  body: 'Un contenu attend une décision de modération'
                },
                data: {
                  screen: 'Moderation',
                  targetType: report.targetType,
                  targetId: report.targetId,
                  reportId: report.id.toString()
                }
              });
            } catch (error) {
              console.error('Erreur envoi FCM:', error);
              // Disable invalid token
              await strapi.entityService.update('api::device-token.device-token', token.id, {
                data: { enabled: false }
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur notification modérateurs:', error);
    }
  },

  // Get moderation queue (next pending report with content)
  async getQueue(reportId: string | null = null) {
    let filters: any = { status: 'pending' };
    
    if (reportId) {
      filters.id = reportId;
    }

    const reports = await strapi.entityService.findMany('api::moderation-report.moderation-report', {
      filters,
      populate: {
        reporter: {
          fields: ['username', 'firstName', 'lastName']
        }
      },
      sort: { createdAt: 'asc' },
      limit: 1
    });

    if ((reports as any[]).length === 0) {
      return null;
    }

    const report = (reports as any[])[0];
    let content = null;

    // Fetch the actual content based on targetType
    try {
      if (report.targetType === 'announcement') {
        // Use findMany with documentId filter for Strapi v5
        const announcements = await strapi.entityService.findMany('api::announcement.announcement', {
          filters: {
            documentId: report.targetId
          } as any,
          populate: {
            seller: {
              fields: ['username', 'firstName', 'lastName']
            },
            images: true
          },
          limit: 1
        });
        content = announcements.length > 0 ? announcements[0] : null;
      } else if (report.targetType === 'carpool') {
        // Use findMany with documentId filter for Strapi v5
        const carpools = await strapi.entityService.findMany('api::carpool.carpool', {
          filters: {
            documentId: report.targetId
          } as any,
          populate: {
            user: {
              fields: ['username', 'firstName', 'lastName']
            }
          } as any,
          limit: 1
        });
        content = carpools.length > 0 ? carpools[0] : null;
      }
    } catch (error) {
      console.error('Erreur récupération contenu:', error);
      // Content might be deleted, but we still show the report
    }

    return {
      report,
      content
    };
  },

  // Keep content (mark as kept)
  async keep(reportId: string, moderatorId: number) {
    return await strapi.entityService.update('api::moderation-report.moderation-report', reportId, {
      data: {
        status: 'kept',
        moderator: moderatorId,
        resolvedAt: new Date().toISOString()
      }
    });
  },

  // Remove content (soft delete)
  async remove(reportId: string, moderatorId: number) {
    const report = await strapi.entityService.findOne('api::moderation-report.moderation-report', reportId, {
      populate: {
        reporter: true
      }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Soft delete the content
    try {
      if ((report as any).targetType === 'announcement') {
        await strapi.entityService.update('api::announcement.announcement', (report as any).targetId, {
          data: { etat: 'supprimée' }
        });
      } else if ((report as any).targetType === 'carpool') {
        await strapi.entityService.update('api::carpool.carpool', (report as any).targetId, {
          data: { status: 'supprimé' } as any
        });
      }
    } catch (error) {
      console.error('Erreur suppression contenu:', error);
      // Continue with report update even if content deletion fails
    }

    // Update report status
    return await strapi.entityService.update('api::moderation-report.moderation-report', reportId, {
      data: {
        status: 'removed',
        moderator: moderatorId,
        resolvedAt: new Date().toISOString()
      }
    });
  }
}));

