/**
 * Surcharge du service users-permissions.
 *
 * Le contrôleur `/api/users/me` par défaut appelle `fetchAuthenticatedUser(id)`,
 * qui ne peuple que `role`. On ajoute `assignedUnit` pour que l'unité du
 * référent matériel remonte au front (comme un `isModerator`, mais relation).
 *
 * ⚠️ La relation peuplée n'est conservée dans la réponse `/me` (sanitization)
 *    que si le rôle Authenticated a le droit de lire le content-type `Unit`
 *    (Settings → Roles → Authenticated → Unit : find/findOne).
 */
export default {
  async fetchAuthenticatedUser(id: any) {
    return strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id },
      populate: ['role', 'assignedUnit'],
    });
  },
};
