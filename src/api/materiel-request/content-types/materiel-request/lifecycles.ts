/**
 * Lifecycle hooks pour les demandes de matériel.
 * Envoie les notifications automatiquement (comme pour les réservations).
 */

const UID = 'api::materiel-request.materiel-request';

const modeLabel = (type: string) => (type === 'don' ? 'don' : 'prêt');

export default {
  /**
   * À la création d'une demande → notifier les référents de l'unité détentrice.
   */
  async afterCreate(event: any) {
    const { result } = event;
    try {
      const req = await strapi.db.query(UID).findOne({
        where: { id: result.id },
        populate: {
          requester: true,
          equipment: { populate: ['ownerUnit'] },
        },
      });
      if (!req?.equipment?.ownerUnit) return;

      // Validateurs = users dont l'unité assignée détient l'équipement
      const referents = await strapi.db.query('plugin::users-permissions.user').findMany({
        where: {
          isMaterielValidateur: true,
          assignedUnit: req.equipment.ownerUnit.id,
        },
      });
      if (referents.length === 0) return;

      const requesterName = req.requester?.firstName
        ? `${req.requester.firstName} ${req.requester.lastName || ''}`.trim()
        : req.requester?.username || 'Un utilisateur';

      await strapi.service('api::notification.notification').createNotificationForUsers(
        referents.map((u: any) => u.id),
        {
          type: 'materiel_request',
          title: `Nouvelle demande de ${modeLabel(req.type)}`,
          body: `${requesterName} demande « ${req.equipment.name} »`,
          priority: 'high',
          relatedItemId: result.id.toString(),
          relatedItemType: 'materiel',
          data: { requestId: result.id, equipmentName: req.equipment.name, type: req.type },
        }
      );
    } catch (error) {
      console.error('❌ Erreur afterCreate (materiel-request):', error);
    }
  },

  /**
   * À la décision → notifier le demandeur.
   */
  async afterUpdate(event: any) {
    const { result } = event;
    try {
      const req = await strapi.db.query(UID).findOne({
        where: { id: result.id },
        populate: { requester: true, equipment: true },
      });
      if (!req?.requester) return;

      const userId = req.requester.id;
      const name = req.equipment?.name || 'le matériel';
      const status = req.status;

      if (status === 'accepte') {
        await strapi.service('api::notification.notification').createNotification(userId, {
          type: 'materiel_accepted',
          title: `Demande de ${modeLabel(req.type)} acceptée`,
          body: `Votre demande pour « ${name} » a été acceptée. Une conversation a été ouverte.`,
          priority: 'high',
          relatedItemId: result.id.toString(),
          relatedItemType: 'materiel',
          data: { requestId: result.id, conversationId: req.conversationId || null },
        });
      }

      if (status === 'refuse') {
        await strapi.service('api::notification.notification').createNotification(userId, {
          type: 'materiel_rejected',
          title: `Demande de ${modeLabel(req.type)} refusée`,
          body: req.decisionReason
            ? `Votre demande pour « ${name} » a été refusée : ${req.decisionReason}`
            : `Votre demande pour « ${name} » a été refusée.`,
          priority: 'normal',
          relatedItemId: result.id.toString(),
          relatedItemType: 'materiel',
        });
      }
    } catch (error) {
      console.error('❌ Erreur afterUpdate (materiel-request):', error);
    }
  },
};
