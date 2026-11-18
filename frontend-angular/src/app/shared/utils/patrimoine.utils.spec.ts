import {
  buildOsmMapUrl,
  hasValidCoordinates,
  isLieuDeMemoire,
  sortEtapes,
} from './patrimoine.utils';

describe('patrimoine.utils', () => {
  describe('isLieuDeMemoire', () => {
    it('detects memorial sites case-insensitively', () => {
      expect(
        isLieuDeMemoire({
          nomPatrimoine: 'Maison des Esclaves de Gorée',
          codePatrimoine: 'PAT-DKR-001',
        })
      ).toBe(true);
      expect(
        isLieuDeMemoire({
          nomPatrimoine: 'Mémorial-Musée du Joola',
        })
      ).toBe(true);
    });

    it('returns false for standard cultural sites or null', () => {
      expect(
        isLieuDeMemoire({
          nomPatrimoine: 'Cathédrale Saint-Antoine de Padoue',
          codePatrimoine: 'PAT-ZIG-003',
        })
      ).toBe(false);
      expect(isLieuDeMemoire(null)).toBe(false);
    });
  });

  describe('sortEtapes', () => {
    it('sorts steps ascending without mutating source array', () => {
      const source = [
        { id: 2, ordre: 3, dureeVisite: 75, patrimoineId: 3, patrimoine: null },
        { id: 1, ordre: 1, dureeVisite: 90, patrimoineId: 1, patrimoine: null },
        { id: 3, ordre: 2, dureeVisite: 60, patrimoineId: 2, patrimoine: null },
      ];
      const sorted = sortEtapes(source);
      expect(sorted.map((s) => s.ordre)).toEqual([1, 2, 3]);
      expect(source[0].ordre).toBe(3);
    });
  });

  describe('coordinates & buildOsmMapUrl', () => {
    it('rejects 0,0 and non-finite coordinates', () => {
      expect(hasValidCoordinates(0, 0)).toBe(false);
      expect(hasValidCoordinates(null, -17.3)).toBe(false);
      expect(hasValidCoordinates(Number.NaN, -17.3)).toBe(false);
      expect(hasValidCoordinates(14.6672, -17.399)).toBe(true);
    });

    it('builds valid OpenStreetMap URL', () => {
      expect(buildOsmMapUrl(14.6672, -17.399)).toBe(
        'https://www.openstreetmap.org/?mlat=14.6672&mlon=-17.399#map=15/14.6672/-17.399'
      );
      expect(buildOsmMapUrl(0, 0)).toBeNull();
    });
  });
});
