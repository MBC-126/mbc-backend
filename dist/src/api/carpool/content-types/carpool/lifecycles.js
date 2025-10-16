"use strict";
// /src/api/carpool/content-types/carpool/lifecycles.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    /**
     * Après création d'un carpool
     * 1. Notification immédiate au créateur (synchrone)
     * 2. Trigger webhook n8n pour rappel 1h avant (event-driven)
     */
    async afterCreate(event) {
        var _a, _b;
        const { result } = event;
        const creatorId = (_a = result.createdBy) === null || _a === void 0 ? void 0 : _a.id;
        // 1. Notification synchrone au créateur
        if (creatorId) {
            try {
                // @ts-ignore
                await strapi.service('api::firebase-notifications').sendNotificationToUser(creatorId, {
                    title: 'Covoiturage créé',
                    body: `Votre covoiturage ${result.departureLocation} → ${result.arrivalLocation} est publié.`,
                });
            }
            catch (error) {
                console.error("❌ Erreur notification création carpool:", error);
            }
        }
        // 2. Trigger webhook n8n pour rappel event-driven
        if (result.departureTime && !result.isRecurring) {
            const webhookUrl = process.env.N8N_WEBHOOK_URL;
            const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
            if (!webhookUrl || !webhookSecret) {
                console.warn('⚠️ N8N_WEBHOOK_URL/SECRET non configuré, skip webhook');
                return;
            }
            try {
                console.log(`📡 Webhook n8n → carpool ${result.id}`);
                const response = await fetch(`${webhookUrl}/carpool-schedule`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Secret': webhookSecret
                    },
                    body: JSON.stringify({
                        carpoolId: result.id,
                        departureTime: result.departureTime,
                        departureLocation: result.departureLocation,
                        arrivalLocation: result.arrivalLocation,
                        driverId: ((_b = result.driver) === null || _b === void 0 ? void 0 : _b.id) || result.driver,
                        eventType: 'created'
                    })
                });
                if (!response.ok) {
                    console.error(`❌ Webhook n8n failed: ${response.status}`);
                }
                else {
                    console.log(`✅ Webhook n8n OK → carpool ${result.id}`);
                }
            }
            catch (error) {
                console.error('❌ Webhook n8n error:', error.message);
            }
        }
    },
    /**
     * Après modification d'un carpool
     * Si departureTime change → reset reminders + re-schedule
     */
    async afterUpdate(event) {
        var _a, _b;
        const { result, params } = event;
        if (params.data.departureTime && !result.isRecurring) {
            const oldDepartureTime = (_a = event.state) === null || _a === void 0 ? void 0 : _a.departureTime;
            const newDepartureTime = params.data.departureTime;
            if (oldDepartureTime !== newDepartureTime) {
                console.log(`🔄 departureTime modifié → carpool ${result.id}`);
                // Reset reminders
                await strapi.db.query('api::carpool.carpool').update({
                    where: { id: result.id },
                    data: { reminderTypesSent: [], reminderSentAt: null }
                });
                // Re-trigger webhook
                const webhookUrl = process.env.N8N_WEBHOOK_URL;
                const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
                if (webhookUrl && webhookSecret) {
                    try {
                        await fetch(`${webhookUrl}/carpool-schedule`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Webhook-Secret': webhookSecret
                            },
                            body: JSON.stringify({
                                carpoolId: result.id,
                                departureTime: newDepartureTime,
                                departureLocation: result.departureLocation,
                                arrivalLocation: result.arrivalLocation,
                                driverId: ((_b = result.driver) === null || _b === void 0 ? void 0 : _b.id) || result.driver,
                                eventType: 'updated'
                            })
                        });
                        console.log(`✅ Webhook n8n re-schedule → carpool ${result.id}`);
                    }
                    catch (error) {
                        console.error('❌ Webhook n8n update error:', error.message);
                    }
                }
            }
        }
    }
};
