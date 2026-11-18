import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Circuit,
  Difficulte,
  MoyenTransport,
  StatutCircuit,
} from '../../../core/models/circuit.model';
import { PageResponse } from '../../../core/models/patrimoine.model';
import { CircuitStats } from '../../../core/models/statistics.model';

export interface CircuitSearchParams {
  q?: string;
  difficulte?: Difficulte | '';
  moyenTransport?: MoyenTransport | '';
  zone?: string;
  statut?: StatutCircuit | '';
  dureeMax?: number | null;
  distanceMax?: number | null;
  prixMax?: number | null;
  inclureNonPublies?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class CircuitApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Circuit[]> {
    return this.http.get<Circuit[]>('/circuits');
  }

  rechercher(params: CircuitSearchParams = {}): Observable<PageResponse<Circuit>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.difficulte) httpParams = httpParams.set('difficulte', params.difficulte);
    if (params.moyenTransport) httpParams = httpParams.set('moyenTransport', params.moyenTransport);
    if (params.zone) httpParams = httpParams.set('zone', params.zone);
    if (params.statut) httpParams = httpParams.set('statut', params.statut);
    if (params.dureeMax != null) httpParams = httpParams.set('dureeMax', String(params.dureeMax));
    if (params.distanceMax != null) {
      httpParams = httpParams.set('distanceMax', String(params.distanceMax));
    }
    if (params.prixMax != null) httpParams = httpParams.set('prixMax', String(params.prixMax));
    if (params.inclureNonPublies) {
      httpParams = httpParams.set('inclureNonPublies', 'true');
    }
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);

    return this.http.get<PageResponse<Circuit>>('/circuits/recherche', {
      params: httpParams,
    });
  }

  getById(id: number | string): Observable<Circuit> {
    return this.http.get<Circuit>(`/circuits/${id}`);
  }

  getMesCircuitsGuide(): Observable<Circuit[]> {
    return this.http.get<Circuit[]>('/circuits/guide/mes-circuits');
  }

  affecterGuideResponsable(circuitId: number | string, guideResponsableId: number | null): Observable<Circuit> {
    return this.http.patch<Circuit>(`/circuits/${circuitId}/guide`, { guideResponsableId });
  }

  create(payload: Partial<Circuit>): Observable<Circuit> {
    return this.http.post<Circuit>('/circuits', payload);
  }

  update(id: number | string, payload: Partial<Circuit>): Observable<Circuit> {
    return this.http.put<Circuit>(`/circuits/${id}`, payload);
  }

  soumettre(id: number | string): Observable<Circuit> {
    return this.http.put<Circuit>(`/circuits/${id}/soumettre`, {});
  }

  publier(id: number | string): Observable<Circuit> {
    return this.http.put<Circuit>(`/circuits/${id}/publier`, {});
  }

  archiver(id: number | string, motif?: string): Observable<Circuit> {
    return this.http.put<Circuit>(`/circuits/${id}/archiver`, motif ? { motif } : {});
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`/circuits/${id}`);
  }

  testerCommunication(
    mode: 'feign' | 'resttemplate' | 'webclient',
    patrimoineId: number | string
  ): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(
      `/circuits/communication/${mode}/patrimoines/${patrimoineId}`
    );
  }

  getStatistiques(): Observable<CircuitStats> {
    return this.http.get<CircuitStats>('/circuits/statistiques');
  }
}
