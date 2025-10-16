"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'PUT',
            path: '/users/:id',
            handler: 'user.update',
        },
        {
            method: 'POST',
            path: '/users/fcm-token',
            handler: 'user.registerFCMToken',
        },
        {
            method: 'DELETE',
            path: '/users/me',
            handler: 'user.deleteMe',
        }
    ]
};
