/**
 * Controller dédié aux endpoints n8n
 * Séparé du controller principal pour plus de clarté
 */

export default {
  /**
   * Récupérer les covoiturages à rappeler (pour cron fallback n8n)
   */
  async toRemind(ctx: any) {
    try {
      const { windowMinutes = '2', reminderType = '1h-before' } = ctx.query;
      // Limite sécurisée pour éviter DoS (max 60 minutes)
      const window = Math.min(Math.max(1, parseInt(windowMinutes as string) || 2), 60);

      const now = new Date();
      const targetTime = new Date(now.getTime() + 60 * 60 * 1000); // +1h
      const windowStart = new Date(targetTime.getTime() - window * 60 * 1000);
      const windowEnd = new Date(targetTime.getTime() + window * 60 * 1000);

      const carpools = await strapi.db.query('api::carpool.carpool').findMany({
        where: {
          departureTime: {
            $gte: windowStart.toISOString(),
            $lte: windowEnd.toISOString()
          },
          isRecurring: false,
          etatCovoiturage: 'active'
        },
        populate: {
          driver: {
            select: ['id', 'firstName', 'fcmToken']
          }
        },
        limit: 100
      });

      const carpoolsToRemind = carpools.filter(carpool => {
        const remindersSent = carpool.reminderTypesSent || [];
        return !remindersSent.includes(reminderType);
      });

      const carpoolsWithPassengers = await Promise.all(
        carpoolsToRemind.map(async (carpool) => {
          const acceptedPassengers = await strapi.db.query('api::carpool-passenger.carpool-passenger').findMany({
            where: {
              carpool: carpool.id,
              status: 'accepted'
            },
            populate: {
              passenger: {
                select: ['id', 'firstName', 'fcmToken']
              }
            }
          });

          return {
            id: carpool.id,
            departureTime: carpool.departureTime,
            departureLocation: carpool.departureLocation,
            arrivalLocation: carpool.arrivalLocation,
            driver: carpool.driver,
            acceptedPassengers: acceptedPassengers.map(p => p.passenger)
          };
        })
      );

      return carpoolsWithPassengers;
    } catch (err) {
      console.error('❌ Erreur toRemind:', err);
      ctx.throw(500, err);
    }
  },

  /**
   * Marquer un covoiturage comme "rappel envoyé"
   */
  async markReminderSent(ctx: any) {
    try {
      const { id } = ctx.params;
      const { reminderType = '1h-before' } = ctx.request.body;

      const carpool = await strapi.db.query('api::carpool.carpool').findOne({
        where: { id },
        select: ['id', 'reminderTypesSent', 'reminderSentAt']
      });

      if (!carpool) {
        return ctx.notFound('Carpool not found');
      }

      const remindersSent = carpool.reminderTypesSent || [];

      if (remindersSent.includes(reminderType)) {
        ctx.status = 409;
        return {
          message: 'Reminder already sent',
          reminderType,
          remindersSent
        };
      }

      const updatedReminders = [...remindersSent, reminderType];

      await strapi.db.query('api::carpool.carpool').update({
        where: { id },
        data: {
          reminderTypesSent: updatedReminders,
          reminderSentAt: new Date()
        }
      });

      console.log(`✅ Reminder "${reminderType}" marqué pour carpool ${id}`);

      return {
        success: true,
        reminderType,
        reminderTypesSent: updatedReminders
      };
    } catch (err) {
      console.error('❌ Erreur markReminderSent:', err);
      ctx.throw(500, err);
    }
  },

  /**
   * Nettoyer les vieux covoiturages
   */
  async cleanup(ctx: any) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const deletedCarpools = await strapi.db.query('api::carpool.carpool').deleteMany({
        where: {
          departureTime: {
            $lt: sevenDaysAgo.toISOString()
          }
        }
      });

      console.log(`🗑️ Nettoyage carpools : ${deletedCarpools?.count || 0} supprimés`);

      return {
        success: true,
        deleted: deletedCarpools?.count || 0,
        message: `${deletedCarpools?.count || 0} covoiturages supprimés`
      };
    } catch (err) {
      console.error('❌ Erreur cleanup carpools:', err);
      ctx.throw(500, err);
    }
  }
};
