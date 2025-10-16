"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/carpools',
            handler: 'carpool.find',
        },
        {
            method: 'GET',
            path: '/carpools/:id',
            handler: 'carpool.findOne',
        },
        {
            method: 'POST',
            path: '/carpools',
            handler: 'carpool.create',
        },
        {
            method: 'PUT',
            path: '/carpools/:id',
            handler: 'carpool.update',
        },
        {
            method: 'DELETE',
            path: '/carpools/:id',
            handler: 'carpool.delete',
        },
        // Gestion des passagers
        {
            method: 'POST',
            path: '/carpools/:id/join',
            handler: 'carpool.join',
        },
        {
            method: 'POST',
            path: '/carpools/:id/leave',
            handler: 'carpool.leave',
        },
        {
            method: 'GET',
            path: '/carpools/:id/passengers',
            handler: 'carpool.getPassengers',
        },
        {
            method: 'PUT',
            path: '/carpools/:id/accept/:userId',
            handler: 'carpool.acceptPassenger',
        },
        {
            method: 'PUT',
            path: '/carpools/:id/reject/:userId',
            handler: 'carpool.rejectPassenger',
        },
        {
            method: 'DELETE',
            path: '/carpools/:id/remove/:userId',
            handler: 'carpool.removePassenger',
        },
        {
            method: 'PUT',
            path: '/carpools/:id/seats',
            handler: 'carpool.updateSeats',
        }
    ]
};
