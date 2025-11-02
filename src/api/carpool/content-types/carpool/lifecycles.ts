// /src/api/carpool/content-types/carpool/lifecycles.ts

export default {
  /**
   * Après création d'un carpool
   * 1. Notification immédiate au créateur (synchrone)
   * 2. Trigger webhook n8n pour rappel 1h avant (event-driven)
   */
  async afterCreate(event: any) {
    const { result } = event;
    const creatorId = result.createdBy?.id;

    // 1. Notification synchrone au créateur
    if (creatorId) {
      try {
        // @ts-ignore
        await strapi.service('api::firebase-notifications').sendNotificationToUser(creatorId, {
          title: 'Covoiturage créé',
          body: `Votre covoiturage ${result.departureLocation} → ${result.arrivalLocation} est publié.`,
        });
      } catch (error) {
        console.error("❌ Erreur notification création carpool:", error);
      }
    }

    // 2. Trigger webhook n8n pour rappel event-driven
    if (result.departureTime && !result.isRecurring) {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

      if (!webhookUrl || !webhookSecret) {
        console.warn('⚠️ N8N_WEBHOOK_URL/SECRET non configuré, skip webhook');
        return;
      }

      try {
        console.log(`📡 Webhook n8n → carpool ${result.id}`);

        const response = await fetch(`${webhookUrl}/carpool-schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': webhookSecret
          },
          body: JSON.stringify({
            carpoolId: result.id,
            departureTime: result.departureTime,
            departureLocation: result.departureLocation,
            arrivalLocation: result.arrivalLocation,
            driverId: result.driver?.id || result.driver,
            eventType: 'created'
          })
        });

        if (!response.ok) {
          console.error(`❌ Webhook n8n failed: ${response.status}`);
        } else {
          console.log(`✅ Webhook n8n OK → carpool ${result.id}`);
        }
      } catch (error: any) {
        console.error('❌ Webhook n8n error:', error.message);
      }
    }
  },

  /**
   * Après modification d'un carpool
   * Si departureTime change → reset reminders + re-schedule
   */
  async afterUpdate(event: any) {
    const { result, params } = event;

    if (params.data.departureTime && !result.isRecurring) {
      const oldDepartureTime = event.state?.departureTime;
      const newDepartureTime = params.data.departureTime;

      if (oldDepartureTime !== newDepartureTime) {
        console.log(`🔄 departureTime modifié → carpool ${result.id}`);

        // Reset reminders
        await strapi.db.query('api::carpool.carpool').update({
          where: { id: result.id },
          data: { reminderTypesSent: [], reminderSentAt: null }
        });

        // Re-trigger webhook
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

        if (webhookUrl && webhookSecret) {
          try {
            await fetch(`${webhookUrl}/carpool-schedule`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': webhookSecret
              },
              body: JSON.stringify({
                carpoolId: result.id,
                departureTime: newDepartureTime,
                departureLocation: result.departureLocation,
                arrivalLocation: result.arrivalLocation,
                driverId: result.driver?.id || result.driver,
                eventType: 'updated'
              })
            });

            console.log(`✅ Webhook n8n re-schedule → carpool ${result.id}`);
          } catch (error: any) {
            console.error('❌ Webhook n8n update error:', error.message);
          }
        }
      }
    }
  },

  /**
   * Après suppression d'un carpool
   * Notifie INSTANTANÉMENT tous les passagers acceptés
   */
  async afterDelete(event: any) {
    const { result } = event;

    try {
      console.log(`🗑️ Covoiturage ${result.id} supprimé - notification aux passagers`);

      // Récupérer tous les passagers acceptés du carpool
      const acceptedPassengers = await strapi.db.query('api::carpool-passenger.carpool-passenger').findMany({
        where: {
          carpool: result.id,
          status: 'accepted'
        },
        populate: ['passenger']
      });

      if (acceptedPassengers.length === 0) {
        console.log(`ℹ️ Aucun passager accepté pour covoiturage ${result.id}`);
        return;
      }

      const departureInfo = `${result.departureLocation} → ${result.arrivalLocation}`;
      const departureTime = result.departureTime
        ? new Date(result.departureTime).toLocaleString('fr-FR', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Date non définie';

      // Notifier INSTANTANÉMENT tous les passagers acceptés
      const passengerIds = acceptedPassengers.map(p => p.passenger.id);

      await strapi.service('api::notification.notification').createNotificationForUsers(
        passengerIds,
        {
          type: 'carpool_cancelled',
          title: '🚫 Covoiturage annulé',
          body: `Le covoiturage ${departureInfo} du ${departureTime} a été annulé par le conducteur.`,
          priority: 'high',
          relatedItemId: result.id.toString(),
          relatedItemType: 'carpool',
          data: {
            carpoolId: result.id,
            departureLocation: result.departureLocation,
            arrivalLocation: result.arrivalLocation,
            departureTime: result.departureTime
          }
        }
      );

      console.log(`✅ ${passengerIds.length} passagers notifiés instantanément de l'annulation`);

    } catch (error) {
      console.error('❌ Erreur afterDelete carpool:', error);
    }
  }
};