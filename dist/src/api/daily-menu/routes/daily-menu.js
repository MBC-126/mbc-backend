"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/daily-menus',
            handler: 'daily-menu.find',
            config: {
                auth: false
            }
        },
        {
            method: 'GET',
            path: '/daily-menus/:id',
            handler: 'daily-menu.findOne',
            config: {
                auth: false
            }
        },
        {
            method: 'POST',
            path: '/daily-menus',
            handler: 'daily-menu.create',
            config: {
                policies: [],
                middlewares: []
            }
        },
        {
            method: 'PUT',
            path: '/daily-menus/:id',
            handler: 'daily-menu.update',
            config: {
                policies: [],
                middlewares: []
            }
        },
        {
            method: 'DELETE',
            path: '/daily-menus/:id',
            handler: 'daily-menu.delete',
            config: {
                policies: [],
                middlewares: []
            }
        }
    ]
};
