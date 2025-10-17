"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/important-announcements',
            handler: 'important-announcement.find',
            config: {
                auth: false
            }
        },
        {
            method: 'GET',
            path: '/important-announcements/:id',
            handler: 'important-announcement.findOne',
            config: {
                auth: false
            }
        }
    ]
};
