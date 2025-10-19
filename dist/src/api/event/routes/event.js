"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/events',
            handler: 'event.find',
            config: {
                auth: false
            }
        },
        {
            method: 'GET',
            path: '/events/:id',
            handler: 'event.findOne',
            config: {
                auth: false
            }
        },
        {
            method: 'POST',
            path: '/events',
            handler: 'event.create',
            config: {
                policies: [],
                middlewares: []
            }
        },
        {
            method: 'PUT',
            path: '/events/:id',
            handler: 'event.update',
            config: {
                policies: [],
                middlewares: []
            }
        },
        {
            method: 'DELETE',
            path: '/events/:id',
            handler: 'event.delete',
            config: {
                policies: [],
                middlewares: []
            }
        }
    ]
};
