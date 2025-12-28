/**
 * Policy pour vérifier que l'utilisateur est modérateur ou administrateur
 * Utilisé pour les actions de modération (queue, keep, remove)
 */

export default async (policyContext: any, config: any, { strapi }: any) => {
  const user = policyContext.state.user;

  if (!user) {
    console.warn('[is-moderator] Utilisateur non authentifié');
    return false;
  }

  // Récupérer l'utilisateur complet avec ses flags
  const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    select: ['id', 'isModerator', 'isAppAdmin']
  });

  if (!fullUser) {
    console.warn(`[is-moderator] Utilisateur ${user.id} introuvable`);
    return false;
  }

  // Vérifier si l'utilisateur est modérateur ou admin
  const isModerator = fullUser.isModerator === true;
  const isAppAdmin = fullUser.isAppAdmin === true;

  if (isModerator || isAppAdmin) {
    return true;
  }

  console.warn(`[is-moderator] Accès refusé pour utilisateur ${user.id}`);
  return false;
};
