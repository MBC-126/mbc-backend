"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/moderation/queue',
            handler: 'api::moderation.moderation.queue',
            config: {
                policies: [],
                middlewares: []
            }
        },
        {
            method: 'POST',
            path: '/moderation/:reportId/keep',
            handler: 'api::moderation.moderation.keep',
            config: {
                policies: [],
                middlewares: []
            }
        },
        {
            method: 'POST',
            path: '/moderation/:reportId/remove',
            handler: 'api::moderation.moderation.remove',
            config: {
                policies: [],
                middlewares: []
            }
        }
    ]
};
