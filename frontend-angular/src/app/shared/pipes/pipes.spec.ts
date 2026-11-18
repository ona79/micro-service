import { DateFrPipe } from './date-fr.pipe';
import { DifficulteLabelPipe } from './difficulte-label.pipe';
import { DurationMinutesPipe } from './duration-minutes.pipe';
import { EvenementTypePipe } from './evenement-type.pipe';
import { FcfaPricePipe } from './fcfa-price.pipe';

describe('Shared formatting pipes', () => {
  it('FcfaPricePipe formats FCFA, Gratuit and missing values', () => {
    const pipe = new FcfaPricePipe();
    expect(pipe.transform(null)).toBe('Non renseigné');
    expect(pipe.transform(0)).toBe('Gratuit');
    expect(pipe.transform(15000)).toContain('FCFA');
  });

  it('DurationMinutesPipe formats minutes and hours', () => {
    const pipe = new DurationMinutesPipe();
    expect(pipe.transform(null)).toBe('Non renseignée');
    expect(pipe.transform(0)).toBe('0 min');
    expect(pipe.transform(45)).toBe('45 min');
    expect(pipe.transform(120)).toBe('2 h');
    expect(pipe.transform(150)).toBe('2 h 30 min');
  });

  it('DifficulteLabelPipe maps circuit difficulty labels', () => {
    const pipe = new DifficulteLabelPipe();
    expect(pipe.transform('FACILE')).toBe('Facile');
    expect(pipe.transform('MOYEN')).toBe('Modéré');
    expect(pipe.transform('DIFFICILE')).toBe('Sportif');
    expect(pipe.transform(null)).toBe('Standard');
  });

  it('EvenementTypePipe maps event type labels', () => {
    const pipe = new EvenementTypePipe();
    expect(pipe.transform('VISITE_GUIDEE')).toBe('Visite guidée');
    expect(pipe.transform('ATELIER')).toBe('Atelier culturel');
    expect(pipe.transform('FESTIVAL')).toBe('Festival');
  });

  it('DateFrPipe formats valid ISO dates and falls back gracefully', () => {
    const pipe = new DateFrPipe();
    expect(pipe.transform(null)).toBe('Date non renseignée');
    expect(pipe.transform('not-a-date')).toBe('not-a-date');
    expect(pipe.transform('2026-12-15T09:30:00')).toContain('2026');
  });
});
