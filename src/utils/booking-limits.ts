/**
 * Règles de plafonnement des réservations par utilisateur.
 */

export const MAX_ACTIVE_RESERVATIONS = 2;

/**
 * Un utilisateur est exempté du plafond de réservations actives s'il est
 * administrateur de l'app ou gestionnaire d'au moins une infrastructure.
 */
export const isExemptFromReservationLimit = async (
  userId: number | string
): Promise<boolean> => {
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: ['id', 'isAppAdmin'],
  });

  if (user?.isAppAdmin === true) {
    return true;
  }

  const managedInfrastructures = await strapi.db
    .query('api::infrastructure.infrastructure')
    .count({
      where: { managers: { id: userId } },
    });

  return managedInfrastructures > 0;
};
