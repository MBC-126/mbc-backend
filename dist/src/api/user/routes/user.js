"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/users/me/abilities',
            handler: 'api::user.user.abilities',
            config: {
                policies: [],
                middlewares: []
            }
        }
    ]
};
