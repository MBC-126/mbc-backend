/**
 * Policy pour vérifier que l'utilisateur est gestionnaire de l'infrastructure
 * Utilisé pour approve/reject/blackouts/regenIcsToken
 */

export default async (policyContext: any, config: any, { strapi }: any) => {
  const userId = policyContext.state.user?.id;

  if (!userId) {
    console.warn('🚫 is-infrastructure-manager: user non authentifié');
    return false;
  }

  // Récupérer infrastructureId depuis params (reservation ou infrastructure directe)
  let infrastructureId = policyContext.params.infrastructureId || policyContext.params.id;

  // Si c'est une reservation, récupérer l'infrastructure
  if (policyContext.params.id && policyContext.request.url.includes('/reservations/')) {
    const reservation = await strapi.db.query('api::reservation.reservation').findOne({
      where: { id: policyContext.params.id },
      populate: ['infrastructure']
    });

    if (!reservation) {
      console.warn('🚫 is-infrastructure-manager: reservation introuvable');
      return false;
    }

    infrastructureId = reservation.infrastructure?.id;
  }

  if (!infrastructureId) {
    console.warn('🚫 is-infrastructure-manager: infrastructureId manquant');
    return false;
  }

  // Convertir documentId en id numérique si nécessaire
  let numericInfrastructureId = infrastructureId;
  if (isNaN(parseInt(infrastructureId, 10))) {
    console.log('🔍 is-infrastructure-manager: conversion documentId -> id:', infrastructureId);
    const infra = await strapi.db.query('api::infrastructure.infrastructure').findOne({
      where: { documentId: infrastructureId }
    });
    if (!infra) {
      console.warn(`🚫 is-infrastructure-manager: infrastructure avec documentId ${infrastructureId} introuvable`);
      return false;
    }
    numericInfrastructureId = infra.id;
    console.log('✅ is-infrastructure-manager: id numérique trouvé:', numericInfrastructureId);
  }

  // Vérifier si l'user est manager de cette infrastructure
  const isManager = await strapi.db.connection.raw(`
    SELECT 1
    FROM infrastructures_managers_lnk
    WHERE infrastructure_id = ? AND user_id = ?
    LIMIT 1
  `, [numericInfrastructureId, userId]);

  if (isManager.rows.length === 0) {
    console.warn(`🚫 is-infrastructure-manager: user ${userId} n'est pas manager de l'infrastructure ${infrastructureId}`);
    return false;
  }

  console.log(`✅ is-infrastructure-manager: user ${userId} autorisé sur infrastructure ${infrastructureId}`);
  return true;
};
