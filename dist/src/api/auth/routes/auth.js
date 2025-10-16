"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/auth/test',
            handler: 'auth.test',
            config: { auth: false },
        },
        {
            method: 'POST',
            path: '/auth/proconnect',
            handler: 'auth.proconnectLogin',
            config: { auth: false },
        },
    ],
};
