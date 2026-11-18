import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface SiteConfig {
  readonly siteName: string;
  readonly siteSubtitle: string;
  readonly siteSlogan: string;
  readonly apiBaseUrl: string;
  readonly universite: {
    readonly nom: string;
    readonly cours: string;
  };
  readonly memorialKeywords: readonly string[];
}

export const SITE_CONFIG: SiteConfig = {
  siteName: 'Casamance Patrimoine',
  siteSubtitle: 'Découverte & Itinéraires Culturels',
  siteSlogan: 'Découvrir, préserver et vivre les trésors culturels et naturels de la Casamance',
  apiBaseUrl: environment.apiBaseUrl,
  universite: {
    nom: 'Université Assane Seck de Ziguinchor — UFR Sciences et Technologies — Département Informatique',
    cours: "Développement d'Applications Orientées Services — L3",
  },
  memorialKeywords: ['joola', 'esclaves', 'memorial', 'mémorial'],
};

export const APP_SITE_CONFIG = new InjectionToken<SiteConfig>('APP_SITE_CONFIG', {
  providedIn: 'root',
  factory: () => SITE_CONFIG,
});
