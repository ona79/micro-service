import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
  });

  it('updates title, meta description, Open Graph tags, and canonical link', () => {
    service.update({
      title: 'Île de Carabane',
      description: 'Ancien comptoir et église missionnaire en Basse-Casamance.',
      canonicalPath: '/patrimoines/2',
    });

    expect(doc.title).toContain('Île de Carabane');
    expect(doc.title).toContain('Casamance Patrimoine');

    const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content');
    expect(desc).toBe('Ancien comptoir et église missionnaire en Basse-Casamance.');

    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    expect(ogTitle).toContain('Île de Carabane');

    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
    expect(canonical).toContain('/patrimoines/2');
  });
});
