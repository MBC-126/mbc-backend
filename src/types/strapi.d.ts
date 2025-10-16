/**
 * Extend Strapi type definitions
 */

import { Strapi as StrapiCore } from '@strapi/strapi';

declare module '@strapi/strapi' {
  export interface Strapi extends StrapiCore {
    firebaseAdmin?: any;
  }
}

declare global {
  const strapi: Strapi;
}

export {};
