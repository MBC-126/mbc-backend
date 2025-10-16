"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/reservations',
            handler: 'reservation.find',
        },
        {
            method: 'GET',
            path: '/reservations/:id',
            handler: 'reservation.findOne',
        },
        {
            method: 'POST',
            path: '/reservations',
            handler: 'reservation.create',
        },
        {
            method: 'PUT',
            path: '/reservations/:id',
            handler: 'reservation.update',
        },
        {
            method: 'DELETE',
            path: '/reservations/:id',
            handler: 'reservation.delete',
        },
        {
            method: 'GET',
            path: '/reservations/availability/check',
            handler: 'reservation.checkAvailability',
        },
        // Routes de workflow de réservation
        {
            method: 'POST',
            path: '/reservations/:id/approve',
            handler: 'reservation.approve',
            config: { policies: ['global::is-infrastructure-manager'] }
        },
        {
            method: 'POST',
            path: '/reservations/:id/reject',
            handler: 'reservation.reject',
            config: { policies: ['global::is-infrastructure-manager'] }
        },
        {
            method: 'POST',
            path: '/reservations/:id/cancel',
            handler: 'reservation.cancel',
            config: { policies: ['global::is-requester-or-manager'] }
        },
        // Route pour n8n
        {
            method: 'GET',
            path: '/reservations/tomorrow',
            handler: 'reservation.findTomorrow',
            config: { auth: false, policies: ['global::require-api-token'] }
        }
    ]
};
