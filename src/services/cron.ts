/**
 * Cron jobs pour les tâches planifiées
 */

/**
 * Démarre tous les cron jobs
 */
export function startAllCronJobs(strapi: any) {
  startNotificationCleanup(strapi);
  startExpiringAnnouncementsCheck(strapi);
  startReservationReminders(strapi);
  startOldCarpoolsCleanup(strapi);
  console.log('🕐 Tous les cron jobs sont démarrés');
}

/**
 * Supprime les notifications de plus de 30 jours
 * S'exécute tous les jours à 3h du matin
 */
function startNotificationCleanup(strapi: any) {
  // Nettoyer immédiatement au démarrage
  cleanOldNotifications(strapi);

  // Puis tous les jours à 3h du matin
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 3 && now.getMinutes() === 0) {
      cleanOldNotifications(strapi);
    }
  }, 60 * 1000); // Check every minute

  console.log('🕐 Cron job: Nettoyage des notifications (tous les jours à 3h)');
}

async function cleanOldNotifications(strapi: any) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Supprimer toutes les notifications créées il y a plus de 30 jours
    const deletedCount = await strapi.db.query('api::notification.notification').deleteMany({
      where: {
        createdAt: {
          $lt: thirtyDaysAgo.toISOString()
        }
      }
    });

    console.log(`🗑️ Nettoyage des notifications : ${deletedCount || 0} notifications supprimées (> 30 jours)`);
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des notifications:', error);
  }
}

/**
 * Vérifie les annonces expirant dans 3 jours et envoie des notifications
 * S'exécute tous les jours à 9h du matin
 */
function startExpiringAnnouncementsCheck(strapi: any) {
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 9 && now.getMinutes() === 0) {
      checkExpiringAnnouncements(strapi);
    }
  }, 60 * 1000); // Check every minute

  console.log('🕐 Cron job: Vérification annonces expirant (tous les jours à 9h)');
}

async function checkExpiringAnnouncements(strapi: any) {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 3);
    twoDaysFromNow.setHours(0, 0, 0, 0);

    // Trouver les annonces actives qui expirent dans 3 jours
    const expiringAnnouncements = await strapi.db.query('api::announcement.announcement').findMany({
      where: {
        etat: 'active',
        expirationDate: {
          $gte: twoDaysFromNow.toISOString(),
          $lte: threeDaysFromNow.toISOString()
        }
      },
      populate: ['seller']
    });

    console.log(`⏰ ${expiringAnnouncements.length} annonce(s) expirant dans 3 jours`);

    for (const announcement of expiringAnnouncements) {
      if (announcement.seller && announcement.seller.id) {
        await strapi.service('api::notification.notification').createNotification(announcement.seller.id, {
          type: 'announcement_expiring',
          title: 'Annonce bientôt expirée ⏰',
          body: `Votre annonce "${announcement.title}" expire dans 3 jours.`,
          priority: 'normal',
          relatedItemId: announcement.documentId,
          relatedItemType: 'announcement'
        });
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des annonces expirant:', error);
  }
}

/**
 * Envoie des rappels pour les réservations du lendemain
 * S'exécute tous les jours à 18h
 */
function startReservationReminders(strapi: any) {
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 18 && now.getMinutes() === 0) {
      sendReservationReminders(strapi);
    }
  }, 60 * 1000); // Check every minute

  console.log('🕐 Cron job: Rappels réservations (tous les jours à 18h)');
}

async function sendReservationReminders(strapi: any) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Trouver les réservations confirmées pour demain
    const tomorrowReservations = await strapi.db.query('api::reservation.reservation').findMany({
      where: {
        etatReservation: 'confirmed',
        startTime: {
          $gte: tomorrow.toISOString(),
          $lt: dayAfterTomorrow.toISOString()
        }
      },
      populate: ['user', 'infrastructure']
    });

    console.log(`📅 ${tomorrowReservations.length} réservation(s) confirmée(s) pour demain`);

    for (const reservation of tomorrowReservations) {
      if (reservation.user && reservation.user.id) {
        const infraName = reservation.infrastructure?.name || 'Infrastructure';
        const startTime = new Date(reservation.startTime).toLocaleString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        await strapi.service('api::notification.notification').createNotification(reservation.user.id, {
          type: 'reservation_reminder',
          title: 'Rappel réservation demain 📅',
          body: `N'oubliez pas votre réservation pour ${infraName} demain à ${startTime}.`,
          priority: 'normal',
          relatedItemId: reservation.id.toString(),
          relatedItemType: 'reservation'
        });
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des rappels de réservation:', error);
  }
}

/**
 * Supprime les trajets ponctuels passés depuis plus de 7 jours
 * S'exécute tous les jours à 4h du matin
 */
function startOldCarpoolsCleanup(strapi: any) {
  // Nettoyer immédiatement au démarrage
  cleanOldCarpools(strapi);

  // Puis tous les jours à 4h du matin
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 4 && now.getMinutes() === 0) {
      cleanOldCarpools(strapi);
    }
  }, 60 * 1000); // Check every minute

  console.log('🕐 Cron job: Nettoyage des trajets passés (tous les jours à 4h)');
}

async function cleanOldCarpools(strapi: any) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Supprimer uniquement les trajets ponctuels (non récurrents) passés depuis plus de 7 jours
    const oldCarpools = await strapi.db.query('api::carpool.carpool').findMany({
      where: {
        isRecurring: false,
        departureTime: {
          $lt: sevenDaysAgo.toISOString()
        }
      }
    });

    if (oldCarpools.length > 0) {
      // Supprimer les passagers associés d'abord
      for (const carpool of oldCarpools) {
        await strapi.db.query('api::carpool-passenger.carpool-passenger').deleteMany({
          where: {
            carpool: carpool.id
          }
        });
      }

      // Puis supprimer les carpools
      const deletedCount = await strapi.db.query('api::carpool.carpool').deleteMany({
        where: {
          id: {
            $in: oldCarpools.map((c: any) => c.id)
          }
        }
      });

      console.log(`🗑️ Nettoyage des trajets : ${deletedCount || 0} trajets ponctuels supprimés (> 7 jours)`);
    } else {
      console.log('✅ Nettoyage des trajets : Aucun trajet à supprimer');
    }
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des trajets:', error);
  }
}
