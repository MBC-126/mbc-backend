import { factories } from '@strapi/strapi';
import FirebaseChatService from '../../../services/firebaseChat';

const getFirebaseAdmin = () => (strapi as any).config.get('firebase.admin');

const UID = 'api::materiel-request.materiel-request';

/**
 * Compte les prêts qui se chevauchent avec [start, end] pour un équipement
 * (statuts accepte/remis = créneaux occupés).
 */
async function overlappingLoans(strapi: any, equipmentId: number, start: Date, end: Date) {
  return strapi.db.query(UID).findMany({
    where: {
      equipment: equipmentId,
      type: 'pret',
      status: { $in: ['accepte', 'remis'] },
      $or: [
        { startDate: { $lte: start }, endDate: { $gt: start } },
        { startDate: { $lt: end }, endDate: { $gte: end } },
        { startDate: { $gte: start }, endDate: { $lte: end } },
      ],
    },
  });
}

export default factories.createCoreController(UID as any, ({ strapi }: any) => ({
  /**
   * Disponibilité d'un équipement sur une période (tient compte de la quantité).
   * GET /materiel-requests/availability/check?equipmentId=&startDate=&endDate=
   */
  async checkAvailability(ctx: any) {
    const { equipmentId, startDate, endDate } = ctx.query;
    if (!equipmentId || !startDate || !endDate) {
      return ctx.badRequest('Paramètres manquants: equipmentId, startDate, endDate');
    }

    const equipment = await strapi.db.query('api::equipment.equipment').findOne({
      where: { id: equipmentId },
    });
    if (!equipment) return ctx.notFound('Équipement introuvable');

    const quantity = equipment.quantity ?? 1;
    const conflicts = await overlappingLoans(strapi, Number(equipmentId), new Date(startDate), new Date(endDate));

    return {
      available: conflicts.length < quantity,
      conflictingCount: conflicts.length,
      quantity,
    };
  },

  /**
   * Créer une demande (don ou prêt). Le demandeur = utilisateur connecté.
   */
  async create(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Vous devez être connecté');

    const { equipment, requesterUnit, type, startDate, endDate, message } = ctx.request.body.data || {};
    if (!equipment || !type) {
      return ctx.badRequest('equipment et type sont requis');
    }

    const eq = await strapi.db.query('api::equipment.equipment').findOne({ where: { id: equipment } });
    if (!eq) return ctx.badRequest('Équipement introuvable');

    if (type === 'pret') {
      if (!startDate || !endDate) return ctx.badRequest('Dates requises pour un prêt');
      const quantity = eq.quantity ?? 1;
      const conflicts = await overlappingLoans(strapi, Number(equipment), new Date(startDate), new Date(endDate));
      if (conflicts.length >= quantity) {
        return ctx.badRequest('Créneau indisponible : déjà prêté sur cette période');
      }
    }

    const created = await strapi.db.query(UID).create({
      data: {
        equipment,
        requester: user.id,
        requesterUnit: requesterUnit || null,
        type,
        startDate: type === 'pret' ? startDate : null,
        endDate: type === 'pret' ? endDate : null,
        message: message || null,
        status: 'demande',
      },
    });

    return ctx.send({ data: created });
  },

  /**
   * Demandes en attente sur le matériel des unités dont je suis référent.
   * GET /materiel-requests/inbox
   */
  async inbox(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Vous devez être connecté');

    const me = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['assignedUnit'],
    });
    if (!me?.isMaterielValidateur || !me.assignedUnit) {
      return ctx.send({ data: [] });
    }

    const pending = await strapi.db.query(UID).findMany({
      where: { status: 'demande', equipment: { ownerUnit: me.assignedUnit.id } },
      populate: {
        equipment: { populate: ['ownerUnit'] },
        requester: true,
        requesterUnit: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return ctx.send({ data: pending });
  },

  /**
   * Accepter une demande (référent). Crée une conversation avec le demandeur
   * + message d'ouverture. La notification est envoyée par le lifecycle afterUpdate.
   */
  async accept(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Vous devez être connecté');

    const { id } = ctx.params;
    const req = await strapi.db.query(UID).findOne({
      where: { id },
      populate: { equipment: { populate: ['ownerUnit'] }, requester: true },
    });
    if (!req) return ctx.notFound('Demande introuvable');
    if (req.status !== 'demande') return ctx.badRequest('Cette demande ne peut plus être acceptée');

    // Ouvrir une conversation avec le demandeur + message d'ouverture
    let conversationId: string | null = null;
    try {
      const chatService = new FirebaseChatService(getFirebaseAdmin());
      const fmt = (d?: string) =>
        d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
      const title = `Matériel : ${req.equipment?.name || ''}`;
      conversationId = await chatService.createOrGetConversation(
        user.id,
        req.requester.id,
        req.equipment?.id?.toString(),
        undefined,
        title
      );
      const opening =
        req.type === 'don'
          ? `Bonjour, votre demande de don pour « ${req.equipment?.name} » a été acceptée. On organise l'enlèvement quand vous voulez.`
          : `Bonjour, votre demande de prêt pour « ${req.equipment?.name} » du ${fmt(req.startDate)} au ${fmt(req.endDate)} a été acceptée. Voici les modalités d'enlèvement et de retour…`;
      await chatService.sendMessage(conversationId, user.id, opening);
    } catch (e: any) {
      console.error('❌ Erreur création conversation (accept materiel):', e?.message);
    }

    await strapi.db.query(UID).update({
      where: { id },
      data: { status: 'accepte', conversationId },
    });

    return ctx.send({ data: { id, status: 'accepte', conversationId } });
  },

  /**
   * Refuser une demande (référent). Notification envoyée par le lifecycle.
   */
  async refuse(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Vous devez être connecté');

    const { id } = ctx.params;
    const { decisionReason } = ctx.request.body || {};

    const req = await strapi.db.query(UID).findOne({ where: { id } });
    if (!req) return ctx.notFound('Demande introuvable');
    if (req.status !== 'demande') return ctx.badRequest('Cette demande ne peut plus être refusée');

    await strapi.db.query(UID).update({
      where: { id },
      data: { status: 'refuse', decisionReason: decisionReason || null },
    });

    return ctx.send({ data: { id, status: 'refuse' } });
  },

  /**
   * Annuler une demande (le demandeur, ou un référent).
   */
  async cancel(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Vous devez être connecté');

    const { id } = ctx.params;
    const req = await strapi.db.query(UID).findOne({
      where: { id },
      populate: { requester: true, equipment: { populate: ['ownerUnit'] } },
    });
    if (!req) return ctx.notFound('Demande introuvable');

    const isRequester = req.requester?.id === user.id;
    const me = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['assignedUnit'],
    });
    const isReferent =
      !!me?.isMaterielValidateur &&
      !!me.assignedUnit &&
      req.equipment?.ownerUnit?.id === me.assignedUnit.id;
    if (!isRequester && !isReferent) return ctx.forbidden('Action non autorisée');

    if (req.status === 'annule' || req.status === 'rendu') {
      return ctx.badRequest('Cette demande ne peut plus être annulée');
    }

    await strapi.db.query(UID).update({ where: { id }, data: { status: 'annule' } });
    return ctx.send({ data: { id, status: 'annule' } });
  },

  async markRemis(ctx: any) {
    const { id } = ctx.params;
    const req = await strapi.db.query(UID).findOne({ where: { id } });
    if (!req) return ctx.notFound('Demande introuvable');
    if (req.status !== 'accepte') return ctx.badRequest('La demande doit être acceptée avant la remise');
    await strapi.db.query(UID).update({ where: { id }, data: { status: 'remis' } });
    return ctx.send({ data: { id, status: 'remis' } });
  },

  async markRendu(ctx: any) {
    const { id } = ctx.params;
    const req = await strapi.db.query(UID).findOne({ where: { id } });
    if (!req) return ctx.notFound('Demande introuvable');
    if (req.status !== 'remis') return ctx.badRequest('Le matériel doit être remis avant le retour');
    await strapi.db.query(UID).update({ where: { id }, data: { status: 'rendu' } });
    return ctx.send({ data: { id, status: 'rendu' } });
  },
}));
