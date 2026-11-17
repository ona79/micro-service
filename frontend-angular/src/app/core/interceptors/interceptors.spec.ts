import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../models/api-error.model';
import { apiPrefixInterceptor } from './api-prefix.interceptor';
import { httpErrorInterceptor } from './http-error.interceptor';

describe('HTTP Interceptors', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('prefixes relative requests with /api and sets Accept header', () => {
    http.get('/patrimoines').subscribe();
    const req = httpMock.expectOne('/api/patrimoines');
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush([]);
  });

  it('extracts {"erreur": "..."} from 400 responses into ApiError', async () => {
    const promise = firstValueFrom(http.post('/reservations', {}));
    const req = httpMock.expectOne('/api/reservations');
    req.flush(
      { erreur: 'Capacité insuffisante pour le circuit 1' },
      { status: 400, statusText: 'Bad Request' }
    );

    await expect(promise).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      kind: 'business',
      message: 'Capacité insuffisante pour le circuit 1',
    } satisfies Partial<ApiError>);
  });

  it('maps status 0 network failures to explicit network ApiError', async () => {
    const promise = firstValueFrom(http.get('/circuits'));
    const req = httpMock.expectOne('/api/circuits');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    await expect(promise).rejects.toMatchObject({
      status: 0,
      kind: 'network',
    });
  });

  it('classifies 503 as unavailable ApiError', async () => {
    const promise = firstValueFrom(http.get('/evenements/99'));
    const req = httpMock.expectOne('/api/evenements/99');
    req.flush(
      { erreur: 'Le service ms-patrimoine est indisponible' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    await expect(promise).rejects.toMatchObject({
      status: 503,
      kind: 'unavailable',
      message: 'Le service ms-patrimoine est indisponible',
    });
  });
});
