"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/infrastructures',
            handler: 'infrastructure.find',
        },
        {
            method: 'GET',
            path: '/infrastructures/:id',
            handler: 'infrastructure.findOne',
        },
        {
            method: 'POST',
            path: '/infrastructures',
            handler: 'infrastructure.create',
        },
        {
            method: 'PUT',
            path: '/infrastructures/:id',
            handler: 'infrastructure.update',
        },
        {
            method: 'DELETE',
            path: '/infrastructures/:id',
            handler: 'infrastructure.delete',
        },
        // Routes avancées
        {
            method: 'POST',
            path: '/infrastructures/:id/add-blackout',
            handler: 'infrastructure.addBlackout',
            config: { policies: ['global::is-infrastructure-manager'] }
        },
        {
            method: 'GET',
            path: '/infrastructures/:id/blackouts',
            handler: 'infrastructure.getBlackouts',
            config: { auth: false } // Accessible à tous pour voir les indisponibilités
        },
        {
            method: 'DELETE',
            path: '/infrastructures/:id/blackouts/:blackoutId',
            handler: 'infrastructure.deleteBlackout',
            config: { policies: ['global::is-infrastructure-manager'] }
        },
        {
            method: 'GET',
            path: '/infrastructures/:id/calendar.ics',
            handler: 'infrastructure.calendarICS',
            config: { auth: false }
        },
        {
            method: 'POST',
            path: '/infrastructures/:id/regen-ics-token',
            handler: 'infrastructure.regenICSToken',
            config: { policies: ['global::is-infrastructure-manager'] }
        }
    ]
};
