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
    }
};
