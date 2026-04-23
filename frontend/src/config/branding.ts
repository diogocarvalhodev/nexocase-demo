/**
 * Central branding configuration.
 * Change values here to rebrand the entire application.
 */
export const APP_CONFIG = {
  /** Product name shown in sidebar, login, and page titles */
  name: 'NexoCase',
  /** Short initials shown when no logo is loaded */
  shortName: 'NC',
  /** Subtitle shown below the product name */
  subtitle: 'Gestão de Ocorrências',
  /** Description used in page metadata */
  description: 'Plataforma de gestão de ocorrências com rastreabilidade, governança e indicadores operacionais',
  /** Copyright line shown in login footer */
  footer: `© ${new Date().getFullYear()} NexoCase · Demo Comercial`,
  /** Commercial headline shown on demo login */
  commercialHeadline: 'Operação previsível para times que não podem falhar',
  /** Commercial subheadline shown on demo login */
  commercialSubheadline: 'Centralize incidentes, ganhe rastreabilidade e acelere decisões com visão executiva em tempo real.',
  /** Public contact shown for lead capture in demo */
  contactEmail: 'contato@nexocase.demo',
  /** Prefix used for generated report filenames */
  reportPrefix: 'relatorio',
  /** Logo alt text */
  logoAlt: 'Logo NexoCase',
} as const;

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const DEMO_ACCOUNTS = [
  {
    label: 'Default Admin',
    username: 'admin',
    password: 'admin',
    description: 'Quick access account for local portfolio demos.',
  },
  {
    label: 'Admin',
    username: 'demo.admin',
    password: 'DemoAdmin!234',
    description: 'Full platform walkthrough: dashboards, admin panel, retention status and exports.',
  },
  {
    label: 'Operator',
    username: 'demo.operator',
    password: 'DemoOperator!234',
    description: 'Incident creation, monitoring workflow and operational execution path.',
  },
  {
    label: 'Director',
    username: 'demo.director',
    password: 'DemoDirector!234',
    description: 'Approval queue and business-facing incident review flow.',
  },
] as const;
