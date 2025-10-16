"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/health',
            handler: 'health.check',
            config: {
                auth: false
            }
        }
    ]
};
