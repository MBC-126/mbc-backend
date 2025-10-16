"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/carpools/to-remind',
            handler: 'n8n.toRemind',
            config: { auth: false, policies: ['global::require-api-token'] }
        },
        {
            method: 'POST',
            path: '/carpools/:id/mark-reminder-sent',
            handler: 'n8n.markReminderSent',
            config: { auth: false, policies: ['global::require-api-token'] }
        },
        {
            method: 'DELETE',
            path: '/carpools/cleanup',
            handler: 'n8n.cleanup',
            config: { auth: false, policies: ['global::require-api-token'] }
        }
    ]
};
