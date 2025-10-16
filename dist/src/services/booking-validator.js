"use strict";
/**
 * Service pour valider les réservations selon les règles de l'infrastructure.
 * Conserve la logique existante, mais en TypeScript afin d'être compilé dans dist/.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBooking = exports.getBookingValidator = exports.BookingValidator = void 0;
const TIMEZONE = 'Europe/Paris';
const WEEKDAY_TO_ISO = {
    lundi: 1,
    mardi: 2,
    mercredi: 3,
    jeudi: 4,
    vendredi: 5,
    samedi: 6,
    dimanche: 7,
};
const formatTimeInParis = (date) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
}).format(date);
const getParisDayOfWeek = (date) => {
    var _a;
    const weekday = new Intl.DateTimeFormat('fr-FR', {
        timeZone: TIMEZONE,
        weekday: 'long',
    })
        .format(date)
        .toLowerCase();
    return (_a = WEEKDAY_TO_ISO[weekday]) !== null && _a !== void 0 ? _a : (date.getUTCDay() || 7);
};
class BookingValidator {
    /**
     * Valider une demande de réservation
     */
    async validate(infrastructureId, startAt, endAt, userId) {
        const errors = [];
        // Récupérer l'infrastructure avec ses règles
        const infrastructure = await strapi.db
            .query('api::infrastructure.infrastructure')
            .findOne({
            where: { id: infrastructureId },
            populate: ['bookingRules'],
        });
        if (!infrastructure || !infrastructure.bookingRules) {
            return {
                valid: false,
                errors: [{ field: 'infrastructure', message: 'Infrastructure introuvable' }],
            };
        }
        const blackouts = await strapi.db
            .query('api::infrastructure-blackout.infrastructure-blackout')
            .findMany({
            where: { infrastructure: infrastructureId },
        });
        const rules = infrastructure.bookingRules;
        const now = new Date();
        const durationMin = (endAt.getTime() - startAt.getTime()) / (1000 * 60);
        // 1. Vérifier que start < end
        if (startAt >= endAt) {
            errors.push({ field: 'dates', message: 'La date de fin doit être après la date de début' });
        }
        // 2. Vérifier le délai de prévenance (lead_time)
        const leadTimeMs = rules.lead_time_min * 60 * 1000;
        if (startAt.getTime() < now.getTime() + leadTimeMs) {
            errors.push({
                field: 'start_at',
                message: `Réservation trop proche (délai minimum: ${rules.lead_time_min} minutes)`,
            });
        }
        // 3. Vérifier la durée min/max
        if (durationMin < rules.min_duration_min) {
            errors.push({
                field: 'duration',
                message: `Durée trop courte (minimum: ${rules.min_duration_min} minutes)`,
            });
        }
        if (durationMin > rules.max_duration_min) {
            errors.push({
                field: 'duration',
                message: `Durée trop longue (maximum: ${rules.max_duration_min} minutes)`,
            });
        }
        // 4. Vérifier le jour de la semaine (1=Lun, 7=Dim) en heure locale Paris
        const dayOfWeek = getParisDayOfWeek(startAt);
        if (!rules.open_days.includes(dayOfWeek)) {
            errors.push({
                field: 'start_at',
                message: `Jour non autorisé pour cette infrastructure`,
            });
        }
        // 5. Vérifier les heures d'ouverture (en lisant les heures locales Paris)
        const startTime = formatTimeInParis(startAt);
        const endTime = formatTimeInParis(endAt);
        const isInOpenHours = rules.open_hours.some((window) => {
            return startTime >= window.start && endTime <= window.end;
        });
        if (!isInOpenHours) {
            errors.push({
                field: 'hours',
                message: `Horaires non autorisés. Créneaux disponibles: ${rules.open_hours
                    .map((w) => `${w.start}-${w.end}`)
                    .join(', ')}`,
            });
        }
        // 6. Vérifier le cooldown (dernière réservation de l'user sur cette infrastructure)
        if (rules.cooldown_min > 0) {
            const lastReservation = await strapi.db
                .query('api::reservation.reservation')
                .findOne({
                where: {
                    infrastructure: infrastructureId,
                    user: userId,
                    etatReservation: { $in: ['pending', 'confirmed'] },
                    endTime: { $lte: startAt.toISOString() },
                },
                orderBy: { endTime: 'desc' },
            });
            if (lastReservation) {
                const cooldownMs = rules.cooldown_min * 60 * 1000;
                const timeSinceLastReservation = startAt.getTime() - new Date(lastReservation.endTime).getTime();
                if (timeSinceLastReservation < cooldownMs) {
                    const remainingMin = Math.ceil((cooldownMs - timeSinceLastReservation) / (1000 * 60));
                    errors.push({
                        field: 'cooldown',
                        message: `Délai de repos non respecté. Attendez encore ${remainingMin} minutes.`,
                    });
                }
            }
        }
        // 7. Vérifier les blackouts (indisponibilités)
        const hasBlackoutConflict = blackouts.some((blackout) => {
            const blackoutStart = new Date(blackout.start_at).getTime();
            const blackoutEnd = new Date(blackout.end_at).getTime();
            const bookingStart = startAt.getTime();
            const bookingEnd = endAt.getTime();
            return bookingStart < blackoutEnd && bookingEnd > blackoutStart;
        });
        if (hasBlackoutConflict) {
            errors.push({
                field: 'blackout',
                message: 'Créneau indisponible (maintenance ou fermeture)',
            });
        }
        return { valid: errors.length === 0, errors };
    }
}
exports.BookingValidator = BookingValidator;
// Singleton
let validatorService = null;
const getBookingValidator = () => {
    if (!validatorService) {
        validatorService = new BookingValidator();
    }
    return validatorService;
};
exports.getBookingValidator = getBookingValidator;
/**
 * Helper function pour appel direct depuis controllers
 */
const validateBooking = async (infrastructure, startAt, endAt, userId) => {
    const validator = (0, exports.getBookingValidator)();
    return validator.validate(infrastructure.id, startAt, endAt, userId);
};
exports.validateBooking = validateBooking;
exports.default = BookingValidator;
