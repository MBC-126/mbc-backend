import { factories } from '@strapi/strapi';
import { validateBooking } from '../../../services/booking-validator';
import {
  MAX_ACTIVE_RESERVATIONS,
  isExemptFromReservationLimit,
} from '../../../utils/booking-limits';

export default factories.createCoreController('api::reservation.reservation' as any, ({ strapi }: any) => ({
  
  async checkAvailability(ctx: any) {
    const { infrastructureId, startTime, endTime } = ctx.query;

    if (!infrastructureId || !startTime || !endTime) {
      return ctx.badRequest('Paramètres manquants: infrastructureId, startTime, endTime');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const conflicts = await strapi.db.query('api::reservation.reservation').findMany({
      where: {
        infrastructure: infrastructureId,
        etatReservation: { $ne: 'cancelled' },
        $or: [
          {
            startTime: { $lte: start },
            endTime: { $gt: start }
          },
          {
            startTime: { $lt: end },
            endTime: { $gte: end }
          },
          {
            startTime: { $gte: start },
            endTime: { $lte: end }
          }
        ]
      },
      populate: ['user']
    });

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.map((r: any) => ({
        id: r.id,
        startTime: r.startTime,
        endTime: r.endTime,
        user: r.user?.username
      }))
    };
  },

  async create(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    // Vérifier le plafond de réservations actives
    // Les gestionnaires d'infrastructures et les admins de l'app en sont dispensés
    const isExempt = await isExemptFromReservationLimit(user.id);

    if (!isExempt) {
      const userActiveReservations = await strapi.db.query('api::reservation.reservation').count({
        where: {
          user: user.id,
          etatReservation: { $in: ['pending', 'confirmed'] }
        }
      });

      if (userActiveReservations >= MAX_ACTIVE_RESERVATIONS) {
        return ctx.badRequest(`Vous avez atteint le maximum de ${MAX_ACTIVE_RESERVATIONS} créneaux réservables simultanément`);
      }
    }

    const { infrastructure, startTime, endTime, notes } = ctx.request.body.data;

    // Récupérer l'infrastructure avec ses règles
    const infra = await strapi.db.query('api::infrastructure.infrastructure').findOne({
      where: { id: infrastructure },
      populate: ['bookingRules', 'managers']
    });

    if (!infra) {
      return ctx.badRequest('Infrastructure introuvable');
    }

    // Validation avancée si bookingRules existe
    if (infra.bookingRules) {
      const validation = await validateBooking(infra, new Date(startTime), new Date(endTime), user.id);

      if (!validation.valid) {
        return ctx.badRequest(validation.errors.map((e: any) => e.message).join(', '));
      }
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const conflicts = await strapi.db.query('api::reservation.reservation').findMany({
      where: {
        infrastructure,
        etatReservation: { $in: ['pending', 'confirmed'] },
        $or: [
          {
            startTime: { $lte: start },
            endTime: { $gt: start }
          },
          {
            startTime: { $lt: end },
            endTime: { $gte: end }
          },
          {
            startTime: { $gte: start },
            endTime: { $lte: end }
          }
        ]
      }
    });

    if (conflicts.length > 0) {
      return ctx.badRequest('Ce créneau est déjà réservé');
    }

    // En Strapi V5, on utilise id pour les relations
    ctx.request.body.data.user = user.id;
    ctx.request.body.data.etatReservation = 'pending';

    const response = await super.create(ctx);

    // NOTE: Notification aux managers est maintenant gérée par le lifecycle hook afterCreate
    // pour éviter les doublons. Le hook utilise le service de notification qui gère
    // à la fois l'enregistrement en DB et l'envoi FCM.
    // Voir: src/api/reservation/content-types/reservation/lifecycles.ts

    return response;
  },

  /**
   * Approuver une réservation (Manager only)
   */
  async approve(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id } = ctx.params;

    // Récupérer la réservation
    const reservation = await strapi.db.query('api::reservation.reservation').findOne({
      where: { id },
      populate: ['infrastructure', 'user']
    });

    if (!reservation) {
      return ctx.notFound('Réservation introuvable');
    }

    if (reservation.etatReservation !== 'pending') {
      return ctx.badRequest('Cette réservation ne peut plus être approuvée');
    }

    // Vérifier que l'utilisateur est manager (déjà fait par policy)

    // Mettre à jour le statut
    await strapi.db.query('api::reservation.reservation').update({
      where: { id },
      data: { etatReservation: 'confirmed' }
    });

    // NOTE: La notification est envoyée automatiquement par le lifecycle hook afterUpdate
    // qui utilise createNotification() pour créer l'entrée en DB et envoyer via Firebase

    return ctx.send({ data: { id, etatReservation: 'confirmed' } });
  },

  /**
   * Rejeter une réservation (Manager only)
   */
  async reject(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id } = ctx.params;
    const { rejection_reason } = ctx.request.body;

    if (!rejection_reason) {
      return ctx.badRequest('Raison du rejet requise');
    }

    // Récupérer la réservation
    const reservation = await strapi.db.query('api::reservation.reservation').findOne({
      where: { id },
      populate: ['infrastructure', 'user']
    });

    if (!reservation) {
      return ctx.notFound('Réservation introuvable');
    }

    if (reservation.etatReservation !== 'pending') {
      return ctx.badRequest('Cette réservation ne peut plus être rejetée');
    }

    // Mettre à jour le statut et la raison du rejet
    // NOTE: La notification est envoyée automatiquement par le lifecycle hook afterUpdate
    await strapi.db.query('api::reservation.reservation').update({
      where: { id },
      data: {
        etatReservation: 'rejected',
        rejection_reason
      }
    });

    return ctx.send({ data: { success: true, message: 'Réservation rejetée' } });
  },

  /**
   * Annuler une réservation (Requester ou Manager)
   */
  async cancel(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id } = ctx.params;

    // Récupérer la réservation
    const reservation = await strapi.db.query('api::reservation.reservation').findOne({
      where: { id },
      populate: ['infrastructure', 'user']
    });

    if (!reservation) {
      return ctx.notFound('Réservation introuvable');
    }

    if (reservation.etatReservation === 'cancelled') {
      return ctx.badRequest('Cette réservation est déjà annulée');
    }

    // Vérifier droits (déjà fait par policy is-requester-or-manager)

    // Mettre à jour le statut
    // NOTE: La notification est envoyée automatiquement par le lifecycle hook afterUpdate
    await strapi.db.query('api::reservation.reservation').update({
      where: { id },
      data: { etatReservation: 'cancelled' }
    });

    return ctx.send({ data: { success: true, message: 'Réservation annulée' } });
  },

  /**
   * Récupérer les réservations de demain (pour n8n)
   */
  async findTomorrow(ctx: any) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Trouver les réservations confirmées pour demain
      const tomorrowReservations = await strapi.db.query('api::reservation.reservation').findMany({
        where: {
          etatReservation: 'confirmed',
          startTime: {
            $gte: tomorrow.toISOString(),
            $lt: dayAfterTomorrow.toISOString()
          }
        },
        populate: {
          user: {
            select: ['id', 'firstName', 'fcmToken']
          },
          infrastructure: {
            select: ['id', 'name']
          }
        }
      });

      ctx.body = tomorrowReservations;
    } catch (err) {
      console.error('❌ Erreur findTomorrow:', err);
      ctx.throw(500, err);
    }
  },

  async delete(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id } = ctx.params;
    console.log(`🗑️ Tentative de suppression réservation ID: ${id} par user ID: ${user.id}`);

    // Récupérer la réservation pour vérifier qu'elle appartient à l'utilisateur
    const reservation = await strapi.db.query('api::reservation.reservation').findOne({
      where: { id },
      populate: ['user']
    });

    if (!reservation) {
      console.log(`❌ Réservation ${id} introuvable`);
      return ctx.notFound('Réservation introuvable');
    }

    console.log(`📋 Réservation trouvée - Owner: ${reservation.user?.id}`);

    // Vérifier que l'utilisateur est bien le propriétaire de la réservation
    if (reservation.user?.id !== user.id) {
      console.log(`❌ User ${user.id} n'est pas le propriétaire de la réservation ${id}`);
      return ctx.forbidden('Vous ne pouvez pas supprimer cette réservation');
    }

    // Supprimer la réservation directement via la query
    console.log(`✅ Suppression de la réservation ${id}`);
    await strapi.db.query('api::reservation.reservation').delete({
      where: { id }
    });
    console.log(`✅ Réservation ${id} supprimée avec succès`);

    return ctx.send({ data: null }, 200);
  }
}));
