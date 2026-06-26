import { factories } from '@strapi/strapi';

/**
 * Suppression d'un équipement : réservée au référent matériel (validateur) de
 * l'unité détentrice, ou à un admin app.
 */
export default factories.createCoreController('api::equipment.equipment' as any, ({ strapi }: any) => ({
  async delete(ctx: any) {
    const authUser = ctx.state.user;
    if (!authUser) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id } = ctx.params;
    const equipment = await strapi.db.query('api::equipment.equipment').findOne({
      where: { id },
      populate: ['ownerUnit'],
    });
    if (!equipment) {
      return ctx.notFound('Matériel introuvable');
    }

    const me = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: authUser.id },
      populate: ['assignedUnit'],
    });

    const isReferent =
      !!me?.isMaterielValidateur &&
      !!me?.assignedUnit &&
      equipment.ownerUnit?.id === me.assignedUnit.id;

    if (!isReferent && !me?.isAppAdmin) {
      return ctx.forbidden("Seul un référent de l'unité détentrice peut supprimer ce matériel.");
    }

    await strapi.db.query('api::equipment.equipment').delete({ where: { id } });
    return ctx.send({ data: { id } });
  },
}));
