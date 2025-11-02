// /src/api/carpool/controllers/carpool.ts

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::carpool.carpool', ({ strapi }) => ({

  // Override find to include accepted passenger count
  async find(ctx) {
    // Call the default find method
    const { data, meta } = await super.find(ctx);

    // For each carpool, add acceptedPassengerCount
    const carpoolsWithCount = await Promise.all(
      data.map(async (carpool: any) => {
        const acceptedCount = await strapi.db.query('api::carpool-passenger.carpool-passenger').count({
          where: {
            carpool: carpool.id,
            status: 'accepted',
          },
        });

        return {
          ...carpool,
          acceptedPassengerCount: acceptedCount,
        };
      })
    );

    return { data: carpoolsWithCount, meta };
  },
  
  // Votre méthode 'create' (on la garde)
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in.');
    }
    const { data } = ctx.request.body;

    // Vérifier que la date n'est pas dans le passé (sauf pour les récurrents)
    if (!data.isRecurring && data.departureTime) {
      const departureDate = new Date(data.departureTime);
      const now = new Date();

      if (departureDate < now) {
        return ctx.badRequest('Vous ne pouvez pas créer un trajet dans le passé.');
      }
    }

    // Vérifier qu'il y a au moins 1 place disponible lors de la création
    if (data.availableSeats !== undefined && data.availableSeats < 1) {
      return ctx.badRequest('Vous devez proposer au moins 1 place disponible.');
    }

    data.driver = user.id;
    const entity = await strapi.service('api::carpool.carpool').create({ data });
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  /**
   * Demander à rejoindre un covoiturage
   */
  async join(ctx) {
    const { id: carpoolId } = ctx.params;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Vous devez être connecté.');
    }

    try {
      // Vérifier si le covoiturage existe
      const carpool = await strapi.db.query('api::carpool.carpool').findOne({
        where: { id: carpoolId },
        populate: ['driver'],
      });

      if (!carpool) {
        return ctx.notFound('Covoiturage introuvable.');
      }

      // Vérifier que l'utilisateur n'est pas le conducteur
      if (carpool.driver?.id === user.id) {
        return ctx.badRequest('Vous ne pouvez pas rejoindre votre propre covoiturage.');
      }

      // Vérifier si l'utilisateur a déjà une demande
      const existingRequest = await strapi.db.query('api::carpool-passenger.carpool-passenger').findOne({
        where: {
          carpool: carpoolId,
          passenger: user.id,
        },
      });

      if (existingRequest) {
        return ctx.badRequest('Vous avez déjà une demande en cours pour ce covoiturage.');
      }

      // Compter les passagers acceptés
      const acceptedCount = await strapi.db.query('api::carpool-passenger.carpool-passenger').count({
        where: {
          carpool: carpoolId,
          status: 'accepted',
        },
      });

      // Déterminer le statut (pending si places dispo, waitlist sinon)
      const status = acceptedCount < carpool.availableSeats ? 'pending' : 'waitlist';

      // Créer la demande
      const request = await strapi.db.query('api::carpool-passenger.carpool-passenger').create({
        data: {
          carpool: carpoolId,
          passenger: user.id,
          status,
        },
      });

      // Envoyer notification au conducteur
      const notificationService = strapi.service('api::notification.notification');
      await notificationService.createNotification({
        userId: carpool.driver.id,
        type: 'carpool_request',
        title: status === 'pending' ? 'Nouvelle demande de covoiturage' : 'Liste d\'attente',
        message: `${user.firstName} ${user.lastName} souhaite rejoindre votre covoiturage.`,
        relatedItemType: 'carpool',
        relatedItemId: carpoolId,
      });

      console.log(`✅ Demande créée : User ${user.id} → Carpool ${carpoolId} (${status})`);

      return {
        success: true,
        status,
        message: status === 'pending'
          ? 'Votre demande a été envoyée au conducteur.'
          : 'Covoiturage complet. Vous êtes ajouté à la liste d\'attente.',
      };
    } catch (error) {
      console.error('❌ Erreur join:', error);
      return ctx.badRequest('Erreur lors de la demande.');
    }
  },

  /**
   * Annuler sa demande / Quitter un covoiturage
   */
  async leave(ctx) {
    const { id: carpoolId } = ctx.params;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Vous devez être connecté.');
    }

    try {
      const request = await strapi.db.query('api::carpool-passenger.carpool-passenger').findOne({
        where: {
          carpool: carpoolId,
          passenger: user.id,
        },
      });

      if (!request) {
        return ctx.notFound('Aucune demande trouvée.');
      }

      await strapi.db.query('api::carpool-passenger.carpool-passenger').delete({
        where: { id: request.id },
      });

      console.log(`✅ Utilisateur ${user.id} a quitté le covoiturage ${carpoolId}`);

      // Notifier INSTANTANÉMENT le conducteur du carpool
      try {
        const carpool = await strapi.db.query('api::carpool.carpool').findOne({
          where: { id: carpoolId },
          populate: ['driver']
        });

        if (carpool && carpool.driver) {
          const departureInfo = `${carpool.departureLocation} → ${carpool.arrivalLocation}`;
          const userName = user.username || 'Un passager';

          await strapi.service('api::notification.notification').createNotification(
            carpool.driver.id,
            {
              type: 'carpool_passenger_left',
              title: '👋 Passager a quitté',
              body: `${userName} a quitté votre covoiturage ${departureInfo}.`,
              priority: 'normal',
              relatedItemId: carpoolId.toString(),
              relatedItemType: 'carpool'
            }
          );

          console.log(`✅ Conducteur ${carpool.driver.id} notifié instantanément du départ du passager`);
        }
      } catch (notifError) {
        console.error('❌ Erreur notification leave:', notifError);
        // Ne pas bloquer la suppression si notification échoue
      }

      return {
        success: true,
        message: 'Vous avez quitté le covoiturage.',
      };
    } catch (error) {
      console.error('❌ Erreur leave:', error);
      return ctx.badRequest('Erreur lors de l\'annulation.');
    }
  },

  /**
   * Accepter un passager (conducteur uniquement)
   */
  async acceptPassenger(ctx) {
    const { id: carpoolId, userId } = ctx.params;
    const driver = ctx.state.user;

    if (!driver) {
      return ctx.unauthorized('Vous devez être connecté.');
    }

    try {
      // Vérifier que l'utilisateur est bien le conducteur
      const carpool = await strapi.db.query('api::carpool.carpool').findOne({
        where: { id: carpoolId },
        populate: ['driver'],
      });

      if (!carpool || carpool.driver?.id !== driver.id) {
        return ctx.forbidden('Vous n\'êtes pas le conducteur de ce covoiturage.');
      }

      // Vérifier les places disponibles
      const acceptedCount = await strapi.db.query('api::carpool-passenger.carpool-passenger').count({
        where: {
          carpool: carpoolId,
          status: 'accepted',
        },
      });

      if (acceptedCount >= carpool.availableSeats) {
        return ctx.badRequest('Plus de places disponibles.');
      }

      // Mettre à jour le statut
      const request = await strapi.db.query('api::carpool-passenger.carpool-passenger').findOne({
        where: {
          carpool: carpoolId,
          passenger: userId,
        },
        populate: ['passenger'],
      });

      if (!request) {
        return ctx.notFound('Demande introuvable.');
      }

      await strapi.db.query('api::carpool-passenger.carpool-passenger').update({
        where: { id: request.id },
        data: { status: 'accepted' },
      });

      // Notifier le passager
      const notificationService = strapi.service('api::notification.notification');
      await notificationService.createNotification({
        userId: parseInt(userId),
        type: 'carpool_accepted',
        title: 'Demande acceptée !',
        message: 'Votre demande de covoiturage a été acceptée.',
        relatedItemType: 'carpool',
        relatedItemId: carpoolId,
      });

      console.log(`✅ Passager ${userId} accepté dans covoiturage ${carpoolId}`);

      return {
        success: true,
        message: 'Passager accepté.',
      };
    } catch (error) {
      console.error('❌ Erreur acceptPassenger:', error);
      return ctx.badRequest('Erreur lors de l\'acceptation.');
    }
  },

  /**
   * Refuser un passager (conducteur uniquement)
   */
  async rejectPassenger(ctx) {
    const { id: carpoolId, userId } = ctx.params;
    const driver = ctx.state.user;

    if (!driver) {
      return ctx.unauthorized('Vous devez être connecté.');
    }

    try {
      // Vérifier que l'utilisateur est bien le conducteur
      const carpool = await strapi.db.query('api::carpool.carpool').findOne({
        where: { id: carpoolId },
        populate: ['driver'],
      });

      if (!carpool || carpool.driver?.id !== driver.id) {
        return ctx.forbidden('Vous n\'êtes pas le conducteur de ce covoiturage.');
      }

      const request = await strapi.db.query('api::carpool-passenger.carpool-passenger').findOne({
        where: {
          carpool: carpoolId,
          passenger: userId,
        },
      });

      if (!request) {
        return ctx.notFound('Demande introuvable.');
      }

      await strapi.db.query('api::carpool-passenger.carpool-passenger').update({
        where: { id: request.id },
        data: { status: 'rejected' },
      });

      // Notifier le passager
      const notificationService = strapi.service('api::notification.notification');
      await notificationService.createNotification({
        userId: parseInt(userId),
        type: 'carpool_rejected',
        title: 'Demande refusée',
        message: 'Votre demande de covoiturage n\'a pas été acceptée.',
        relatedItemType: 'carpool',
        relatedItemId: carpoolId,
      });

      console.log(`✅ Passager ${userId} refusé pour covoiturage ${carpoolId}`);

      return {
        success: true,
        message: 'Passager refusé.',
      };
    } catch (error) {
      console.error('❌ Erreur rejectPassenger:', error);
      return ctx.badRequest('Erreur lors du refus.');
    }
  },

  /**
   * Retirer un passager (conducteur uniquement)
   */
  async removePassenger(ctx) {
    const { id: carpoolId, userId } = ctx.params;
    const driver = ctx.state.user;

    if (!driver) {
      return ctx.unauthorized('Vous devez être connecté.');
    }

    try {
      // Vérifier que l'utilisateur est bien le conducteur
      const carpool = await strapi.db.query('api::carpool.carpool').findOne({
        where: { id: carpoolId },
        populate: ['driver'],
      });

      if (!carpool || carpool.driver?.id !== driver.id) {
        return ctx.forbidden('Vous n\'êtes pas le conducteur de ce covoiturage.');
      }

      const request = await strapi.db.query('api::carpool-passenger.carpool-passenger').findOne({
        where: {
          carpool: carpoolId,
          passenger: userId,
        },
      });

      if (!request) {
        return ctx.notFound('Passager introuvable.');
      }

      await strapi.db.query('api::carpool-passenger.carpool-passenger').delete({
        where: { id: request.id },
      });

      console.log(`✅ Passager ${userId} retiré du covoiturage ${carpoolId}`);

      // Notifier INSTANTANÉMENT le passager retiré
      try {
        const departureInfo = `${carpool.departureLocation} → ${carpool.arrivalLocation}`;
        const departureTime = carpool.departureTime
          ? new Date(carpool.departureTime).toLocaleString('fr-FR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '';

        await strapi.service('api::notification.notification').createNotification(
          userId,
          {
            type: 'carpool_passenger_removed',
            title: '🚫 Retiré du covoiturage',
            body: `Vous avez été retiré du covoiturage ${departureInfo}${departureTime ? ' du ' + departureTime : ''}.`,
            priority: 'normal',
            relatedItemId: carpoolId.toString(),
            relatedItemType: 'carpool'
          }
        );

        console.log(`✅ Passager ${userId} notifié instantanément de son retrait`);
      } catch (notifError) {
        console.error('❌ Erreur notification removePassenger:', notifError);
        // Ne pas bloquer le retrait si notification échoue
      }

      return {
        success: true,
        message: 'Passager retiré.',
      };
    } catch (error) {
      console.error('❌ Erreur removePassenger:', error);
      return ctx.badRequest('Erreur lors du retrait.');
    }
  },

  /**
   * Modifier le nombre de places disponibles (conducteur uniquement)
   */
  async updateSeats(ctx) {
    const { id: carpoolId } = ctx.params;
    const { availableSeats } = ctx.request.body;
    const driver = ctx.state.user;

    if (!driver) {
      return ctx.unauthorized('Vous devez être connecté.');
    }

    try {
      // Vérifier que l'utilisateur est bien le conducteur
      const carpool = await strapi.db.query('api::carpool.carpool').findOne({
        where: { id: carpoolId },
        populate: ['driver'],
      });

      if (!carpool || carpool.driver?.id !== driver.id) {
        return ctx.forbidden('Vous n\'êtes pas le conducteur de ce covoiturage.');
      }

      if (availableSeats === undefined || availableSeats === null || availableSeats < 0 || availableSeats > 8) {
        return ctx.badRequest('Nombre de places invalide (0-8).');
      }

      // Mettre à jour
      await strapi.db.query('api::carpool.carpool').update({
        where: { id: carpoolId },
        data: { availableSeats },
      });

      console.log(`✅ Nombre de places mis à jour pour covoiturage ${carpoolId}: ${availableSeats}`);

      return {
        success: true,
        message: 'Nombre de places mis à jour.',
        availableSeats,
      };
    } catch (error) {
      console.error('❌ Erreur updateSeats:', error);
      return ctx.badRequest('Erreur lors de la mise à jour.');
    }
  },

  /**
   * Récupérer les passagers d'un covoiturage avec leurs statuts
   */
  async getPassengers(ctx) {
    const { id: carpoolId } = ctx.params;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Vous devez être connecté.');
    }

    try {
      const passengers = await strapi.db.query('api::carpool-passenger.carpool-passenger').findMany({
        where: { carpool: carpoolId },
        populate: ['passenger'],
        orderBy: { createdAt: 'asc' },
      });

      const formatted = passengers.map(p => ({
        id: p.id,
        userId: p.passenger.id,
        firstName: p.passenger.firstName,
        lastName: p.passenger.lastName,
        rank: p.passenger.rank,
        status: p.status,
        createdAt: p.createdAt,
      }));

      return {
        success: true,
        passengers: formatted,
      };
    } catch (error) {
      console.error('❌ Erreur getPassengers:', error);
      return ctx.badRequest('Erreur lors de la récupération des passagers.');
    }
  },

  /**
   * Récupérer les covoiturages à rappeler (pour cron fallback n8n)
   * Optimisé : renvoie uniquement départs dans ~1h±window ET pas encore notifié
   */
  async findToRemind(ctx) {
    try {
      const { windowMinutes = '2', reminderType = '1h-before' } = ctx.query;
      const window = parseInt(windowMinutes as string);

      const now = new Date();
      const targetTime = new Date(now.getTime() + 60 * 60 * 1000); // +1h
      const windowStart = new Date(targetTime.getTime() - window * 60 * 1000);
      const windowEnd = new Date(targetTime.getTime() + window * 60 * 1000);

      // Requête optimisée : filtre déjà côté DB
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

      // Filtrer côté app ceux qui n'ont pas déjà reçu ce type de reminder
      const carpoolsToRemind = carpools.filter(carpool => {
        const remindersSent = carpool.reminderTypesSent || [];
        return !remindersSent.includes(reminderType);
      });

      // Pour chaque carpool, récupérer les passagers acceptés
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

      ctx.body = carpoolsWithPassengers;
    } catch (err) {
      console.error('❌ Erreur findToRemind:', err);
      ctx.throw(500, err);
    }
  },

  /**
   * Marquer un covoiturage comme "rappel envoyé" (pour n8n)
   * Idempotent : renvoie 409 si déjà envoyé
   */
  async markReminderSent(ctx) {
    try {
      const { id } = ctx.params;
      const { reminderType = '1h-before' } = ctx.request.body;

      // Récupérer le carpool actuel
      const carpool = await strapi.db.query('api::carpool.carpool').findOne({
        where: { id },
        select: ['id', 'reminderTypesSent', 'reminderSentAt']
      });

      if (!carpool) {
        return ctx.notFound('Carpool not found');
      }

      const remindersSent = carpool.reminderTypesSent || [];

      // Idempotence : si déjà envoyé, renvoyer 409
      if (remindersSent.includes(reminderType)) {
        return ctx.conflict({
          message: 'Reminder already sent',
          reminderType,
          remindersSent
        });
      }

      // Ajouter le type de reminder
      const updatedReminders = [...remindersSent, reminderType];

      await strapi.db.query('api::carpool.carpool').update({
        where: { id },
        data: {
          reminderTypesSent: updatedReminders,
          reminderSentAt: new Date()
        }
      });

      console.log(`✅ Reminder "${reminderType}" marqué comme envoyé pour carpool ${id}`);

      ctx.body = {
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
   * Nettoyer les covoiturages de plus de 7 jours (pour n8n)
   */
  async cleanup(ctx) {
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

      ctx.body = {
        success: true,
        deleted: deletedCarpools?.count || 0,
        message: `${deletedCarpools?.count || 0} covoiturages supprimés`
      };
    } catch (err) {
      console.error('❌ Erreur cleanup carpools:', err);
      ctx.throw(500, err);
    }
  },

  // Méthode delete sécurisée - seul le conducteur peut supprimer son covoiturage
  async delete(ctx) {
    console.log("🗑️ Handler 'delete' appelé pour un covoiturage");
    
    const { id: carpoolId } = ctx.params;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Vous devez être connecté pour supprimer un covoiturage.');
    }

    console.log(`🔍 Utilisateur ID ${user.id} demande à supprimer le covoiturage ID ${carpoolId}`);

    try {
      // 1. Récupérer le covoiturage avec son conducteur
      const carpool = await strapi.db.query('api::carpool.carpool').findOne({
        where: { id: carpoolId },
        populate: ['driver'],
      });

      if (!carpool) {
        return ctx.notFound('Covoiturage non trouvé.');
      }

      console.log(`🚗 Covoiturage trouvé. Conducteur ID: ${carpool.driver?.id}`);

      // 2. Vérifier que l'utilisateur est bien le conducteur
      if (carpool.driver?.id !== user.id) {
        console.log(`❌ Utilisateur ${user.id} n'est pas le conducteur (${carpool.driver?.id})`);
        return ctx.forbidden('Vous ne pouvez supprimer que vos propres covoiturages.');
      }

      // 3. Supprimer le covoiturage
      console.log(`✅ Suppression du covoiturage ${carpoolId} par son conducteur`);
      const deletedCarpool = await strapi.db.query('api::carpool.carpool').delete({
        where: { id: carpoolId },
      });

      console.log(`🎉 Covoiturage ${carpoolId} supprimé avec succès`);
      
      // 4. Retourner une réponse de succès
    return { 
        data: deletedCarpool,
      success: true, 
        message: 'Covoiturage supprimé avec succès.' 
    };

    } catch (error) {
      console.error(`❌ Erreur lors de la suppression du covoiturage ${carpoolId}:`, error);
      return ctx.badRequest('Erreur lors de la suppression du covoiturage.');
    }
  },

  /**
   * Envoyer un reminder FCM pour un covoiturage
   * Appelé par N8N 1h avant le départ
   */
  async sendReminder(ctx) {
    const { id: carpoolId } = ctx.params;

    try {
      console.log(`⏰ Envoi reminder pour covoiturage ${carpoolId}`);

      // Récupérer le covoiturage avec driver et passagers acceptés
      const carpool = await strapi.db.query('api::carpool.carpool').findOne({
        where: { id: carpoolId },
        populate: ['driver']
      });

      if (!carpool) {
        return ctx.notFound('Covoiturage introuvable.');
      }

      // Récupérer tous les passagers acceptés
      const acceptedPassengers = await strapi.db.query('api::carpool-passenger.carpool-passenger').findMany({
        where: {
          carpool: carpoolId,
          status: 'accepted'
        },
        populate: ['passenger']
      });

      const departureInfo = `${carpool.departureLocation} → ${carpool.arrivalLocation}`;
      const departureTime = carpool.departureTime
        ? new Date(carpool.departureTime).toLocaleString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : '';

      // Préparer la liste des participants (conducteur + passagers)
      const allParticipantIds = [
        carpool.driver.id,
        ...acceptedPassengers.map(p => p.passenger.id)
      ];

      // Envoyer notification FCM INSTANTANÉE à tous les participants
      await strapi.service('api::notification.notification').createNotificationForUsers(
        allParticipantIds,
        {
          type: 'carpool_reminder',
          title: `🚗 Départ dans 1h !`,
          body: `Rappel: Covoiturage ${departureInfo} à ${departureTime}`,
          priority: 'high',
          relatedItemId: carpoolId.toString(),
          relatedItemType: 'carpool',
          data: {
            carpoolId,
            departureLocation: carpool.departureLocation,
            arrivalLocation: carpool.arrivalLocation,
            departureTime: carpool.departureTime,
            participantCount: allParticipantIds.length
          }
        }
      );

      // Marquer le reminder comme envoyé
      const sentTypes = carpool.reminderTypesSent || [];
      if (!sentTypes.includes('1h_before')) {
        await strapi.db.query('api::carpool.carpool').update({
          where: { id: carpoolId },
          data: {
            reminderTypesSent: [...sentTypes, '1h_before'],
            reminderSentAt: new Date()
          }
        });
      }

      console.log(`✅ Reminder envoyé instantanément à ${allParticipantIds.length} participants`);

      return {
        success: true,
        message: 'Reminder envoyé avec succès.',
        sentTo: allParticipantIds.length
      };

    } catch (error) {
      console.error(`❌ Erreur sendReminder covoiturage ${carpoolId}:`, error);
      return ctx.badRequest('Erreur lors de l\'envoi du reminder.');
    }
  }
}));