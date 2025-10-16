import type { Schema, Struct } from '@strapi/strapi';

export interface InfrastructureBookingRules extends Struct.ComponentSchema {
  collectionName: 'components_infrastructure_booking_rules';
  info: {
    description: 'Rules for infrastructure booking validation';
    displayName: 'Booking rules';
  };
  attributes: {
    cooldown_min: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    lead_time_min: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<120>;
    max_duration_min: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<120>;
    min_duration_min: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<30>;
    open_days: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<[1, 2, 3, 4, 5]>;
    open_hours: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<
        [
          {
            end: '18:00';
            start: '08:00';
          },
        ]
      >;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'infrastructure.booking-rules': InfrastructureBookingRules;
    }
  }
}
