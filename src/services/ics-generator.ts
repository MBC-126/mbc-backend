import crypto from 'crypto';

/**
 * Formater une date en format ICS (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Générer un fichier ICS pour les réservations d'une infrastructure
 * Helper function pour appel direct depuis controllers
 */
export function generateICS(infrastructure: any, reservations: any[]): string {
  const lines: string[] = [];

  // En-tête du calendrier
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//MaBaseConnectee//Infrastructure Booking//FR');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${infrastructure.name}`);
  lines.push(`X-WR-CALDESC:Réservations de ${infrastructure.name}`);
  lines.push('X-WR-TIMEZONE:Europe/Paris');

  // Timezone Europe/Paris
  lines.push('BEGIN:VTIMEZONE');
  lines.push('TZID:Europe/Paris');
  lines.push('BEGIN:DAYLIGHT');
  lines.push('TZOFFSETFROM:+0100');
  lines.push('TZOFFSETTO:+0200');
  lines.push('TZNAME:CEST');
  lines.push('DTSTART:19700329T020000');
  lines.push('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU');
  lines.push('END:DAYLIGHT');
  lines.push('BEGIN:STANDARD');
  lines.push('TZOFFSETFROM:+0200');
  lines.push('TZOFFSETTO:+0100');
  lines.push('TZNAME:CET');
  lines.push('DTSTART:19701025T030000');
  lines.push('RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU');
  lines.push('END:STANDARD');
  lines.push('END:VTIMEZONE');

  // Événements (réservations)
  reservations.forEach((reservation) => {
    const startDate = new Date(reservation.startTime);
    const endDate = new Date(reservation.endTime);
    const now = new Date();

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:reservation-${reservation.id}@mabaseconnectee.fr`);
    lines.push(`DTSTAMP:${formatICSDate(now)}`);
    lines.push(`DTSTART:${formatICSDate(startDate)}`);
    lines.push(`DTEND:${formatICSDate(endDate)}`);

    // Titre de l'événement (sans PII pour RGPD)
    lines.push(`SUMMARY:Réservation ${infrastructure.name}`);

    // Description (optionnelle, sans données sensibles)
    if (reservation.purpose) {
      lines.push(`DESCRIPTION:Objet: ${reservation.purpose}`);
    } else {
      lines.push(`DESCRIPTION:Réservation confirmée`);
    }

    // Localisation
    if (infrastructure.location) {
      lines.push(`LOCATION:${infrastructure.location}`);
    }

    // Statut
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');

    // Catégorie
    lines.push(`CATEGORIES:Infrastructure,${infrastructure.type || 'Autre'}`);

    lines.push('END:VEVENT');
  });

  // Fin du calendrier
  lines.push('END:VCALENDAR');

  // Joindre toutes les lignes avec CRLF (requis par la spec ICS)
  return lines.join('\r\n');
}

/**
 * Service pour générer des fichiers ICS (iCalendar) - classe pour compatibilité
 */
export class ICSGenerator {
  /**
   * Générer un fichier ICS pour une infrastructure
   */
  async generate(infrastructureId: number): Promise<string> {
    const infrastructure = await strapi.db.query('api::infrastructure.infrastructure').findOne({
      where: { id: infrastructureId },
      select: ['id', 'name', 'location', 'type']
    });

    if (!infrastructure) {
      throw new Error('Infrastructure introuvable');
    }

    // Récupérer toutes les réservations confirmées de cette infrastructure
    const reservations = await strapi.db.query('api::reservation.reservation').findMany({
      where: {
        infrastructure: infrastructureId,
        etatReservation: 'confirmed',
        startTime: { $gte: new Date().toISOString() }
      },
      populate: ['user'],
      orderBy: { startTime: 'asc' }
    });

    return generateICS(infrastructure, reservations);
  }

  /**
   * Calculer un ETag pour le cache
   */
  async calculateETag(infrastructureId: number): Promise<{ etag: string; lastModified: Date }> {
    const result = await strapi.db.connection.raw(`
      SELECT
        MAX(updated_at) as latest,
        COUNT(*) as count
      FROM reservations
      WHERE infrastructure_id = ? AND etat_reservation = 'confirmed'
    `, [infrastructureId]);

    const latest = result.rows[0]?.latest || new Date().toISOString();
    const count = result.rows[0]?.count || 0;

    const etag = crypto
      .createHash('md5')
      .update(`${infrastructureId}:${latest}:${count}`)
      .digest('hex');

    return {
      etag,
      lastModified: new Date(latest)
    };
  }

}

// Singleton
let icsService: ICSGenerator | null = null;

export function getICSGenerator(): ICSGenerator {
  if (!icsService) {
    icsService = new ICSGenerator();
  }
  return icsService;
}
