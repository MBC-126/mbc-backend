"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async registerFCMToken(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté');
        }
        const { fcmToken } = ctx.request.body;
        if (!fcmToken) {
            return ctx.badRequest('Token FCM manquant');
        }
        console.log(`📲 Enregistrement token FCM pour user ${user.id}`);
        try {
            await strapi.db.query('plugin::users-permissions.user').update({
                where: { id: user.id },
                data: { fcmToken }
            });
            return { message: 'Token FCM enregistré avec succès' };
        }
        catch (error) {
            console.error('Erreur registerFCMToken:', error);
            ctx.throw(500, 'Erreur lors de l\'enregistrement du token FCM');
        }
    },
    async update(ctx) {
        const authenticatedUser = ctx.state.user;
        if (!authenticatedUser) {
            return ctx.unauthorized('Vous devez être connecté');
        }
        const { id } = ctx.params;
        // Vérifier que l'utilisateur ne peut modifier que son propre profil
        if (parseInt(id) !== authenticatedUser.id) {
            return ctx.forbidden('Vous ne pouvez modifier que votre propre profil');
        }
        const { firstName, lastName, rank, unit, notificationPreferences } = ctx.request.body;
        console.log(`📝 Mise à jour utilisateur ${id}:`, { firstName, lastName, rank, unit, notificationPreferences });
        try {
            const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
                where: { id },
                data: {
                    firstName,
                    lastName,
                    rank,
                    unit,
                    notificationPreferences
                }
            });
            console.log(`✅ Utilisateur ${id} mis à jour avec succès`);
            return updatedUser;
        }
        catch (error) {
            console.error('Erreur mise à jour utilisateur:', error);
            ctx.throw(500, 'Erreur lors de la mise à jour du profil');
        }
    },
    async deleteMe(ctx) {
        const userId = ctx.state.user.id;
        try {
            // Supprimer toutes les annonces de l'utilisateur
            await strapi.db.query('api::announcement.announcement').deleteMany({
                where: { seller: userId }
            });
            // Supprimer tous les covoiturages créés
            await strapi.db.query('api::carpool.carpool').deleteMany({
                where: { createdBy: userId }
            });
            // Supprimer toutes les réservations
            await strapi.db.query('api::reservation.reservation').deleteMany({
                where: { user: userId }
            });
            // Supprimer l'utilisateur
            await strapi.plugins['users-permissions'].services.user.remove({ id: userId });
            return { message: 'Compte supprimé avec succès' };
        }
        catch (error) {
            console.error('Erreur suppression compte:', error);
            ctx.throw(500, 'Erreur lors de la suppression du compte');
        }
    }
};
