import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_SITE_CONFIG } from '../config/site.config';

/**
 * Préfixe automatiquement les requêtes relatives (ex: '/patrimoines')
 * avec la base API configurée ('/api'), sans altérer les URLs absolues ou déjà préfixées.
 */
export const apiPrefixInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(APP_SITE_CONFIG);
  const url = req.url;

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith(config.apiBaseUrl)
  ) {
    return next(req);
  }

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  const updatedReq = req.clone({
    url: `${config.apiBaseUrl}${normalizedPath}`,
    setHeaders: {
      Accept: 'application/json',
    },
  });

  return next(updatedReq);
};
