"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::announcement.announcement', ({ strapi }) => ({
    async create(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Utilisateur non authentifié');
        }
        console.log('📸 CREATE - Fichiers reçus:', ctx.request.files);
        console.log('📦 CREATE - Body reçu:', JSON.stringify(ctx.request.body, null, 2));
        if (typeof ctx.request.body.data === 'string') {
            ctx.request.body.data = JSON.parse(ctx.request.body.data);
        }
        const dataWithSeller = {
            ...ctx.request.body.data,
            seller: user.id
        };
        // Créer l'annonce
        const entry = await strapi.documents('api::announcement.announcement').create({
            data: dataWithSeller
        });
        // Gérer l'upload des fichiers si présents (peut être un tableau ou un fichier unique)
        if (ctx.request.files && ctx.request.files['files.images']) {
            const imageFiles = ctx.request.files['files.images'];
            console.log('📸 CREATE - Images à uploader:', imageFiles);
            try {
                // Upload les fichiers via le service upload
                const uploadResult = await strapi.plugins.upload.services.upload.upload({
                    data: {
                        refId: entry.id,
                        ref: 'api::announcement.announcement',
                        field: 'images',
                    },
                    files: Array.isArray(imageFiles) ? imageFiles : [imageFiles],
                });
                console.log('✅ CREATE - Upload réussi:', uploadResult);
            }
            catch (error) {
                console.error('❌ CREATE - Erreur upload images:', error);
            }
        }
        else {
            console.log('⚠️ CREATE - Aucun fichier reçu dans ctx.request.files');
        }
        // Re-fetch l'annonce avec les relations pour la retourner complète
        const updatedEntry = await strapi.documents('api::announcement.announcement').findOne({
            documentId: entry.documentId,
            populate: {
                seller: {
                    fields: ['documentId', 'firstName', 'lastName', 'rank', 'unit']
                },
                images: true
            }
        });
        return { data: updatedEntry };
    },
    // Méthode update sécurisée - seul le vendeur peut modifier son annonce
    async update(ctx) {
        var _a, _b, _c;
        console.log("✏️ Handler 'update' appelé pour une annonce");
        const { id: announcementId } = ctx.params;
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté pour modifier une annonce.');
        }
        console.log(`🔍 Utilisateur ID ${user.id} demande à modifier l'annonce ID ${announcementId}`);
        console.log(`📦 Body reçu:`, JSON.stringify(ctx.request.body, null, 2));
        try {
            // 1. Récupérer l'annonce avec son vendeur
            const announcement = await strapi.documents('api::announcement.announcement').findOne({
                documentId: announcementId,
                populate: ['seller'],
            });
            if (!announcement) {
                console.log(`❌ Annonce ${announcementId} non trouvée`);
                return ctx.notFound('Annonce non trouvée.');
            }
            console.log(`📢 Annonce trouvée. Vendeur ID: ${(_a = announcement.seller) === null || _a === void 0 ? void 0 : _a.id}, User ID: ${user.id}`);
            // 2. Vérifier que l'utilisateur est bien le vendeur
            if (((_b = announcement.seller) === null || _b === void 0 ? void 0 : _b.id) !== user.id) {
                console.log(`❌ Utilisateur ${user.id} n'est pas le vendeur (${(_c = announcement.seller) === null || _c === void 0 ? void 0 : _c.id})`);
                return ctx.forbidden('Vous ne pouvez modifier que vos propres annonces.');
            }
            // 3. Préparer les données à mettre à jour
            let dataToUpdate = ctx.request.body.data || ctx.request.body;
            // Si c'est une string, la parser
            if (typeof dataToUpdate === 'string') {
                dataToUpdate = JSON.parse(dataToUpdate);
            }
            console.log(`📝 Données à mettre à jour:`, dataToUpdate);
            // 4. Mettre à jour l'annonce
            console.log(`✅ Mise à jour de l'annonce ${announcementId} par son vendeur`);
            const updatedEntry = await strapi.documents('api::announcement.announcement').update({
                documentId: announcementId,
                data: dataToUpdate
            });
            console.log(`✅ Annonce mise à jour dans la DB`);
            // 5. Gérer l'upload des nouvelles images si présentes
            if (ctx.request.files && ctx.request.files['files.images']) {
                const imageFiles = ctx.request.files['files.images'];
                console.log(`📸 Upload de ${Array.isArray(imageFiles) ? imageFiles.length : 1} nouvelle(s) image(s)`);
                try {
                    // Supprimer les anciennes images avant d'ajouter les nouvelles
                    if (announcement.images && announcement.images.length > 0) {
                        console.log(`🗑️ Suppression de ${announcement.images.length} ancienne(s) image(s)`);
                        for (const image of announcement.images) {
                            try {
                                await strapi.plugins.upload.services.upload.remove(image);
                            }
                            catch (err) {
                                console.error(`⚠️ Erreur lors de la suppression de l'image ${image.id}:`, err);
                            }
                        }
                    }
                    // Uploader les nouvelles images
                    await strapi.plugins.upload.services.upload.upload({
                        data: {
                            refId: updatedEntry.id,
                            ref: 'api::announcement.announcement',
                            field: 'images',
                        },
                        files: Array.isArray(imageFiles) ? imageFiles : [imageFiles],
                    });
                    console.log(`✅ Images uploadées avec succès`);
                }
                catch (error) {
                    console.error('❌ Erreur upload images:', error);
                }
            }
            // 6. Re-fetch l'annonce avec les relations pour la retourner complète
            const finalEntry = await strapi.documents('api::announcement.announcement').findOne({
                documentId: announcementId,
                populate: {
                    seller: {
                        fields: ['documentId', 'firstName', 'lastName', 'rank', 'unit']
                    },
                    images: true
                }
            });
            console.log(`🎉 Annonce ${announcementId} mise à jour avec succès`);
            return { data: finalEntry };
        }
        catch (error) {
            console.error(`❌ Erreur lors de la mise à jour de l'annonce ${announcementId}:`, error);
            console.error(`❌ Stack trace:`, error.stack);
            return ctx.badRequest(`Erreur lors de la mise à jour de l'annonce: ${error.message}`);
        }
    },
    /**
     * Récupérer les annonces expirant dans X jours (pour n8n)
     */
    async findExpiring(ctx) {
        try {
            const { days } = ctx.query;
            const daysAhead = parseInt(days) || 3;
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + daysAhead);
            targetDate.setHours(23, 59, 59, 999);
            const startOfDay = new Date();
            startOfDay.setDate(startOfDay.getDate() + daysAhead);
            startOfDay.setHours(0, 0, 0, 0);
            // Trouver les annonces qui ne sont pas vendues/supprimées et qui expirent dans X jours
            const expiringAnnouncements = await strapi.db.query('api::announcement.announcement').findMany({
                where: {
                    etat: 'disponible',
                    expirationDate: {
                        $gte: startOfDay.toISOString(),
                        $lte: targetDate.toISOString()
                    }
                },
                populate: {
                    seller: {
                        select: ['id', 'firstName', 'fcmToken']
                    }
                }
            });
            ctx.body = expiringAnnouncements;
        }
        catch (err) {
            console.error('❌ Erreur findExpiring:', err);
            ctx.throw(500, err);
        }
    },
    // Méthode delete sécurisée - seul le vendeur peut supprimer son annonce
    async delete(ctx) {
        var _a, _b, _c;
        console.log("🗑️ Handler 'delete' appelé pour une annonce");
        const { id: announcementId } = ctx.params;
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté pour supprimer une annonce.');
        }
        console.log(`🔍 Utilisateur ID ${user.id} demande à supprimer l'annonce ID ${announcementId}`);
        try {
            // 1. Récupérer l'annonce avec son vendeur
            const announcement = await strapi.documents('api::announcement.announcement').findOne({
                documentId: announcementId,
                populate: ['seller'],
            });
            if (!announcement) {
                return ctx.notFound('Annonce non trouvée.');
            }
            console.log(`📢 Annonce trouvée. Vendeur ID: ${(_a = announcement.seller) === null || _a === void 0 ? void 0 : _a.id}`);
            // 2. Vérifier que l'utilisateur est bien le vendeur
            if (((_b = announcement.seller) === null || _b === void 0 ? void 0 : _b.id) !== user.id) {
                console.log(`❌ Utilisateur ${user.id} n'est pas le vendeur (${(_c = announcement.seller) === null || _c === void 0 ? void 0 : _c.id})`);
                return ctx.forbidden('Vous ne pouvez supprimer que vos propres annonces.');
            }
            // 3. Supprimer l'annonce
            console.log(`✅ Suppression de l'annonce ${announcementId} par son vendeur`);
            const deletedAnnouncement = await strapi.documents('api::announcement.announcement').delete({
                documentId: announcementId,
            });
            console.log(`🎉 Annonce ${announcementId} supprimée avec succès`);
            // 4. Retourner une réponse de succès
            return {
                data: deletedAnnouncement,
                success: true,
                message: 'Annonce supprimée avec succès.'
            };
        }
        catch (error) {
            console.error(`❌ Erreur lors de la suppression de l'annonce ${announcementId}:`, error);
            return ctx.badRequest('Erreur lors de la suppression de l\'annonce.');
        }
    }
}));
