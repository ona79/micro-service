import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Evenement,
  StatutEvenement,
  TypeEvenement,
} from '../../../core/models/evenement.model';
import { PageResponse } from '../../../core/models/patrimoine.model';

export interface EvenementSearchParams {
  q?: string;
  type?: TypeEvenement | '';
  zone?: string;
  patrimoineId?: number | null;
  statut?: StatutEvenement | '';
  aVenirUniquement?: boolean;
  inclureNonPublies?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class EvenementApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>('/evenements');
  }

  getAVenir(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>('/evenements/a-venir');
  }

  rechercher(params: EvenementSearchParams = {}): Observable<PageResponse<Evenement>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.zone) httpParams = httpParams.set('zone', params.zone);
    if (params.patrimoineId != null) {
      httpParams = httpParams.set('patrimoineId', String(params.patrimoineId));
    }
    if (params.statut) httpParams = httpParams.set('statut', params.statut);
    if (params.aVenirUniquement) httpParams = httpParams.set('aVenirUniquement', 'true');
    if (params.inclureNonPublies) httpParams = httpParams.set('inclureNonPublies', 'true');
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);

    return this.http.get<PageResponse<Evenement>>('/evenements/recherche', {
      params: httpParams,
    });
  }

  getById(id: number | string): Observable<Evenement> {
    return this.http.get<Evenement>(`/evenements/${id}`);
  }

  create(payload: Partial<Evenement>): Observable<Evenement> {
    return this.http.post<Evenement>('/evenements', payload);
  }

  update(id: number | string, payload: Partial<Evenement>): Observable<Evenement> {
    return this.http.put<Evenement>(`/evenements/${id}`, payload);
  }

  soumettre(id: number | string): Observable<Evenement> {
    return this.http.put<Evenement>(`/evenements/${id}/soumettre`, {});
  }

  publier(id: number | string): Observable<Evenement> {
    return this.http.put<Evenement>(`/evenements/${id}/publier`, {});
  }

  annuler(id: number | string, motif?: string): Observable<Evenement> {
    return this.http.put<Evenement>(`/evenements/${id}/annuler`, motif ? { motif } : {});
  }

  terminer(id: number | string): Observable<Evenement> {
    return this.http.put<Evenement>(`/evenements/${id}/terminer`, {});
  }

  archiver(id: number | string, motif?: string): Observable<Evenement> {
    return this.http.put<Evenement>(`/evenements/${id}/archiver`, motif ? { motif } : {});
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`/evenements/${id}`);
  }
}
