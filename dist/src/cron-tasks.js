"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    // S'exécute toutes les heures pour marquer les réservations passées comme terminées
    '0 * * * *': async ({ strapi }) => {
        try {
            console.log('⏰ Vérification des réservations terminées...');
            const now = new Date().toISOString();
            // Trouver toutes les réservations confirmées dont la date de fin est passée
            const pastReservations = await strapi.db.query('api::reservation.reservation').findMany({
                where: {
                    etatReservation: { $in: ['confirmed', 'approved'] },
                    endTime: { $lt: now }
                }
            });
            console.log(`📊 ${pastReservations.length} réservation(s) passée(s) trouvée(s)`);
            // Mettre à jour chaque réservation
            for (const reservation of pastReservations) {
                try {
                    await strapi.db.query('api::reservation.reservation').update({
                        where: { id: reservation.id },
                        data: { etatReservation: 'completed' }
                    });
                    console.log(`✅ Réservation ${reservation.id} marquée comme terminée`);
                }
                catch (error) {
                    console.error(`❌ Erreur mise à jour réservation ${reservation.id}:`, error);
                }
            }
            console.log('✅ Vérification des réservations terminée');
        }
        catch (error) {
            console.error('❌ Erreur globale cron réservations:', error);
        }
    },
    // S'exécute tous les jours à 3h du matin
    '0 3 * * *': async ({ strapi }) => {
        console.log('🗑️ Vérification des comptes inactifs...');
        const twoYearsAgo = new Date();
        twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);
        // Trouver les utilisateurs inactifs depuis 24 mois
        const inactiveUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
            where: {
                lastLoginAt: {
                    $lt: twoYearsAgo
                }
            }
        });
        console.log(`📊 ${inactiveUsers.length} comptes inactifs trouvés`);
        for (const user of inactiveUsers) {
            try {
                // Supprimer les contenus de l'utilisateur
                await strapi.db.query('api::announcement.announcement').deleteMany({
                    where: { seller: user.id }
                });
                await strapi.db.query('api::carpool.carpool').deleteMany({
                    where: { createdBy: user.id }
                });
                await strapi.db.query('api::reservation.reservation').deleteMany({
                    where: { user: user.id }
                });
                // Supprimer l'utilisateur
                await strapi.plugins['users-permissions'].services.user.remove({ id: user.id });
                console.log(`✅ Compte supprimé : ${user.email}`);
            }
            catch (error) {
                console.error(`❌ Erreur suppression ${user.email}:`, error);
            }
        }
        console.log('✅ Nettoyage terminé');
    },
    // S'exécute tous les jours à 4h du matin pour nettoyer les événements périmés
    '0 4 * * *': async ({ strapi }) => {
        try {
            console.log('🗑️ Nettoyage des événements périmés...');
            // Date d'il y a 7 jours
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            // Trouver tous les événements non-récurrents
            const allEvents = await strapi.db.query('api::event.event').findMany({
                select: ['id', 'date', 'isRecurring', 'recurrenceEndDate']
            });
            let deletedCount = 0;
            // Filtrer et supprimer les événements périmés depuis 7 jours
            for (const event of allEvents) {
                if (!event.date)
                    continue;
                // Ne pas supprimer les événements récurrents actifs
                if (event.isRecurring) {
                    // Supprimer seulement si recurrenceEndDate est définie et périmée depuis 7 jours
                    if (event.recurrenceEndDate) {
                        const endDate = new Date(event.recurrenceEndDate);
                        if (endDate < sevenDaysAgo) {
                            try {
                                await strapi.db.query('api::event.event').delete({
                                    where: { id: event.id }
                                });
                                deletedCount++;
                                console.log(`✅ Événement récurrent ${event.id} supprimé (fin de récurrence: ${event.recurrenceEndDate})`);
                            }
                            catch (error) {
                                console.error(`❌ Erreur suppression événement ${event.id}:`, error);
                            }
                        }
                    }
                    // Sinon, événement récurrent sans fin, on ne le supprime pas
                    continue;
                }
                // Pour les événements non-récurrents
                const eventDate = new Date(event.date);
                // Si l'événement est périmé depuis plus de 7 jours
                if (eventDate < sevenDaysAgo) {
                    try {
                        await strapi.db.query('api::event.event').delete({
                            where: { id: event.id }
                        });
                        deletedCount++;
                        console.log(`✅ Événement ${event.id} supprimé (date: ${event.date})`);
                    }
                    catch (error) {
                        console.error(`❌ Erreur suppression événement ${event.id}:`, error);
                    }
                }
            }
            console.log(`✅ Nettoyage des événements terminé: ${deletedCount} événement(s) supprimé(s)`);
        }
        catch (error) {
            console.error('❌ Erreur globale cron événements:', error);
        }
    }
};
