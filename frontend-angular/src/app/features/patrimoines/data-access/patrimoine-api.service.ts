import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CategoriePatrimoine,
  PageResponse,
  Patrimoine,
  StatutPublication,
  ZoneCasamance,
} from '../../../core/models/patrimoine.model';
import { PatrimoineStats } from '../../../core/models/statistics.model';

export interface PatrimoineSearchParams {
  q?: string;
  categorie?: CategoriePatrimoine | '';
  zone?: ZoneCasamance | '';
  localite?: string;
  statut?: StatutPublication | '';
  capaciteMin?: number | null;
  tarifMax?: number | null;
  inclureNonPublies?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class PatrimoineApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Patrimoine[]> {
    return this.http.get<Patrimoine[]>('/patrimoines');
  }

  getProximite(lat: number, lon: number, rayonKm = 50, limit = 12): Observable<Patrimoine[]> {
    const params = new HttpParams()
      .set('lat', String(lat))
      .set('lon', String(lon))
      .set('rayonKm', String(rayonKm))
      .set('limit', String(limit));
    return this.http.get<Patrimoine[]>('/patrimoines/proximite', { params });
  }

  rechercher(params: PatrimoineSearchParams = {}): Observable<PageResponse<Patrimoine>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.categorie) httpParams = httpParams.set('categorie', params.categorie);
    if (params.zone) httpParams = httpParams.set('zone', params.zone);
    if (params.localite) httpParams = httpParams.set('localite', params.localite);
    if (params.statut) httpParams = httpParams.set('statut', params.statut);
    if (params.capaciteMin != null) {
      httpParams = httpParams.set('capaciteMin', String(params.capaciteMin));
    }
    if (params.tarifMax != null) {
      httpParams = httpParams.set('tarifMax', String(params.tarifMax));
    }
    if (params.inclureNonPublies) {
      httpParams = httpParams.set('inclureNonPublies', 'true');
    }
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);

    return this.http.get<PageResponse<Patrimoine>>('/patrimoines/recherche', {
      params: httpParams,
    });
  }

  getById(id: number | string): Observable<Patrimoine> {
    return this.http.get<Patrimoine>(`/patrimoines/${id}`);
  }

  create(payload: Omit<Patrimoine, 'id'>): Observable<Patrimoine> {
    return this.http.post<Patrimoine>('/patrimoines', payload);
  }

  update(id: number | string, payload: Omit<Patrimoine, 'id'>): Observable<Patrimoine> {
    return this.http.put<Patrimoine>(`/patrimoines/${id}`, payload);
  }

  soumettre(id: number | string): Observable<Patrimoine> {
    return this.http.put<Patrimoine>(`/patrimoines/${id}/soumettre`, {});
  }

  publier(id: number | string): Observable<Patrimoine> {
    return this.http.put<Patrimoine>(`/patrimoines/${id}/publier`, {});
  }

  archiver(id: number | string, motif?: string): Observable<Patrimoine> {
    return this.http.put<Patrimoine>(`/patrimoines/${id}/archiver`, motif ? { motif } : {});
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`/patrimoines/${id}`);
  }

  getStatistiques(): Observable<PatrimoineStats> {
    return this.http.get<PatrimoineStats>('/patrimoines/statistiques');
  }
}
