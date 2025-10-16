/**
 * Policy pour cancel : requester OU manager peut annuler
 */

export default async (policyContext: any, config: any, { strapi }: any) => {
  const userId = policyContext.state.user?.id;

  if (!userId) {
    console.warn('🚫 is-requester-or-manager: user non authentifié');
    return false;
  }

  const reservationId = policyContext.params.id;

  const reservation = await strapi.db.query('api::reservation.reservation').findOne({
    where: { id: reservationId },
    populate: ['user', 'infrastructure']
  });

  if (!reservation) {
    console.warn('🚫 is-requester-or-manager: reservation introuvable');
    return false;
  }

  const isRequester = reservation.user?.id === userId;

  // Vérifier si c'est un manager de l'infrastructure
  const isManager = await strapi.db.connection.raw(`
    SELECT 1
    FROM infrastructures_managers_lnk
    WHERE infrastructure_id = ? AND user_id = ?
    LIMIT 1
  `, [reservation.infrastructure?.id, userId]);

  if (!isRequester && isManager.rows.length === 0) {
    console.warn(`🚫 is-requester-or-manager: user ${userId} n'est ni requester ni manager`);
    return false;
  }

  console.log(`✅ is-requester-or-manager: user ${userId} autorisé sur reservation ${reservationId}`);
  return true;
};
