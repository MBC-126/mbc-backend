/**
 * Policy : vérifie que l'utilisateur est validateur matériel ET que l'unité
 * qui lui est assignée détient l'équipement concerné par la demande.
 * Utilisé pour accept / refuse / remis / rendu.
 */

export default async (policyContext: any, config: any, { strapi }: any) => {
  const userId = policyContext.state.user?.id;
  if (!userId) {
    console.warn('🚫 is-equipment-referent: user non authentifié');
    return false;
  }

  const requestId = policyContext.params.id;
  if (!requestId) {
    console.warn('🚫 is-equipment-referent: id de demande manquant');
    return false;
  }

  // Utilisateur avec son unité assignée + flag validateur
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    populate: ['assignedUnit'],
  });

  if (!user?.isMaterielValidateur || !user.assignedUnit) {
    console.warn(`🚫 is-equipment-referent: user ${userId} non validateur ou sans unité`);
    return false;
  }

  // Unité détentrice de l'équipement de la demande
  const req = await strapi.db.query('api::materiel-request.materiel-request').findOne({
    where: { id: requestId },
    populate: { equipment: { populate: ['ownerUnit'] } },
  });

  const ownerUnitId = req?.equipment?.ownerUnit?.id;
  if (!ownerUnitId) {
    console.warn('🚫 is-equipment-referent: unité détentrice introuvable');
    return false;
  }

  return user.assignedUnit.id === ownerUnitId;
};
