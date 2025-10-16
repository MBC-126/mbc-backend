"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::carpool-review.carpool-review', ({ strapi }) => ({
    /**
     * Créer une review pour un covoiturage
     */
    async create(ctx) {
        var _a;
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté.');
        }
        const { carpoolId, revieweeId, rating, comment } = ctx.request.body.data;
        try {
            // Vérifier que le covoiturage existe
            const carpool = await strapi.db.query('api::carpool.carpool').findOne({
                where: { id: carpoolId },
                populate: ['driver'],
            });
            if (!carpool) {
                return ctx.notFound('Covoiturage introuvable.');
            }
            // Vérifier que l'utilisateur a participé à ce covoiturage
            const isDriver = ((_a = carpool.driver) === null || _a === void 0 ? void 0 : _a.id) === user.id;
            const isPassenger = await strapi.db.query('api::carpool-passenger.carpool-passenger').findOne({
                where: {
                    carpool: carpoolId,
                    passenger: user.id,
                    status: 'accepted',
                },
            });
            if (!isDriver && !isPassenger) {
                return ctx.forbidden('Vous devez avoir participé à ce covoiturage pour le noter.');
            }
            // Vérifier que l'utilisateur n'a pas déjà noté cette personne pour ce covoiturage
            const existingReview = await strapi.db.query('api::carpool-review.carpool-review').findOne({
                where: {
                    carpool: carpoolId,
                    reviewer: user.id,
                    reviewee: revieweeId,
                },
            });
            if (existingReview) {
                return ctx.badRequest('Vous avez déjà noté cette personne pour ce covoiturage.');
            }
            // Créer la review
            const review = await strapi.db.query('api::carpool-review.carpool-review').create({
                data: {
                    carpool: carpoolId,
                    reviewer: user.id,
                    reviewee: revieweeId,
                    rating,
                    comment,
                },
            });
            // Mettre à jour la moyenne et le compteur de reviews de l'utilisateur noté
            await updateUserRating(strapi, revieweeId);
            console.log(`✅ Review créée : User ${user.id} a noté User ${revieweeId} (${rating}⭐)`);
            return {
                success: true,
                review,
            };
        }
        catch (error) {
            console.error('❌ Erreur create review:', error);
            return ctx.badRequest('Erreur lors de la création de la review.');
        }
    },
    /**
     * Récupérer les reviews qu'un utilisateur peut donner pour un covoiturage
     */
    async getPendingReviews(ctx) {
        var _a;
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté.');
        }
        const { carpoolId } = ctx.params;
        try {
            const carpool = await strapi.db.query('api::carpool.carpool').findOne({
                where: { id: carpoolId },
                populate: ['driver'],
            });
            if (!carpool) {
                return ctx.notFound('Covoiturage introuvable.');
            }
            // Vérifier que le trajet est passé
            const now = new Date();
            const carpoolDate = new Date(carpool.departureTime);
            if (carpoolDate > now) {
                return ctx.badRequest('Ce covoiturage n\'est pas encore passé.');
            }
            // Liste des personnes à noter
            const toReview = [];
            // Si l'utilisateur est le conducteur, il peut noter les passagers acceptés
            if (((_a = carpool.driver) === null || _a === void 0 ? void 0 : _a.id) === user.id) {
                const passengers = await strapi.db.query('api::carpool-passenger.carpool-passenger').findMany({
                    where: {
                        carpool: carpoolId,
                        status: 'accepted',
                    },
                    populate: ['passenger'],
                });
                for (const p of passengers) {
                    // Vérifier si déjà noté
                    const alreadyReviewed = await strapi.db.query('api::carpool-review.carpool-review').findOne({
                        where: {
                            carpool: carpoolId,
                            reviewer: user.id,
                            reviewee: p.passenger.id,
                        },
                    });
                    if (!alreadyReviewed) {
                        toReview.push({
                            id: p.passenger.id,
                            firstName: p.passenger.firstName,
                            lastName: p.passenger.lastName,
                            rank: p.passenger.rank,
                        });
                    }
                }
            }
            else {
                // Si l'utilisateur est un passager, il peut noter le conducteur
                const isPassenger = await strapi.db.query('api::carpool-passenger.carpool-passenger').findOne({
                    where: {
                        carpool: carpoolId,
                        passenger: user.id,
                        status: 'accepted',
                    },
                });
                if (isPassenger) {
                    const alreadyReviewed = await strapi.db.query('api::carpool-review.carpool-review').findOne({
                        where: {
                            carpool: carpoolId,
                            reviewer: user.id,
                            reviewee: carpool.driver.id,
                        },
                    });
                    if (!alreadyReviewed) {
                        const driver = await strapi.db.query('plugin::users-permissions.user').findOne({
                            where: { id: carpool.driver.id },
                        });
                        toReview.push({
                            id: driver.id,
                            firstName: driver.firstName,
                            lastName: driver.lastName,
                            rank: driver.rank,
                        });
                    }
                }
            }
            return {
                success: true,
                toReview,
            };
        }
        catch (error) {
            console.error('❌ Erreur getPendingReviews:', error);
            return ctx.badRequest('Erreur lors de la récupération des reviews.');
        }
    },
}));
/**
 * Met à jour la note moyenne d'un utilisateur
 */
async function updateUserRating(strapi, userId) {
    try {
        // Récupérer toutes les reviews de cet utilisateur
        const reviews = await strapi.db.query('api::carpool-review.carpool-review').findMany({
            where: {
                reviewee: userId,
            },
        });
        if (reviews.length === 0) {
            return;
        }
        // Calculer la moyenne
        const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
        const average = sum / reviews.length;
        // Mettre à jour l'utilisateur
        await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: userId },
            data: {
                carpoolRating: average.toFixed(2),
                carpoolReviewsCount: reviews.length,
            },
        });
        console.log(`📊 Rating mis à jour pour User ${userId}: ${average.toFixed(2)}⭐ (${reviews.length} reviews)`);
    }
    catch (error) {
        console.error('❌ Erreur updateUserRating:', error);
    }
}
