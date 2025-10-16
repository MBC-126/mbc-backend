"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'POST',
            path: '/carpool-reviews',
            handler: 'carpool-review.create',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/carpool-reviews/pending/:carpoolId',
            handler: 'carpool-review.getPendingReviews',
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ],
};
