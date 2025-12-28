/**
 * Policy pour vérifier que l'utilisateur est administrateur de l'application
 * Utilisé pour les actions admin (gestion announcements, events, menus)
 */

export default async (policyContext: any, config: any, { strapi }: any) => {
  const user = policyContext.state.user;

  if (!user) {
    console.warn('[is-app-admin] Utilisateur non authentifié');
    return false;
  }

  // Récupérer l'utilisateur complet avec son flag admin
  const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    select: ['id', 'isAppAdmin']
  });

  if (!fullUser) {
    console.warn(`[is-app-admin] Utilisateur ${user.id} introuvable`);
    return false;
  }

  if (fullUser.isAppAdmin === true) {
    return true;
  }

  console.warn(`[is-app-admin] Accès refusé pour utilisateur ${user.id}`);
  return false;
};
