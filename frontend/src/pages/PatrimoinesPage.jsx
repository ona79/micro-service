import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllPatrimoines } from '../api/patrimoines';
import { isLieuDeMemoire } from '../utils/formatters';
import FilterBar from '../components/FilterBar';
import Card from '../components/Card';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

// Configuration des filtres de la page Patrimoines
const PATRIMOINE_FILTERS = [
  {
    key: 'search',
    label: 'Recherche (nom, ville, code)',
    type: 'search',
    placeholder: 'Ex: Gorée, Ziguinchor, PAT-DKR...',
  },
  {
    key: 'capaciteMin',
    label: 'Capacité minimale (pers.)',
    type: 'number',
    placeholder: 'Ex: 100',
    min: 0,
    step: 50,
  },
  {
    key: 'tri',
    label: 'Trier par',
    type: 'select',
    options: [
      { value: 'nom_asc', label: 'Nom (A → Z)' },
      { value: 'capacite_desc', label: 'Capacité (plus grande d’abord)' },
      { value: 'capacite_asc', label: 'Capacité (plus petite d’abord)' },
    ],
  },
];

/**
 * Page de liste des Patrimoines (GET /api/patrimoines) avec barre de recherche et filtres côté front.
 */
export default function PatrimoinesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [patrimoines, setPatrimoines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: initialQuery,
    capaciteMin: '',
    tri: 'nom_asc',
  });

  // Synchronise le champ de recherche si le paramètre d'URL ?q= change (ex. depuis l'en-tête)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setFilters((prev) => ({ ...prev, search: q }));
    }
  }, [searchParams]);

  const chargerPatrimoines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllPatrimoines();
      setPatrimoines(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerPatrimoines();
  }, [chargerPatrimoines]);

  // Filtrage et tri côté front sur les données reçues
  const filteredPatrimoines = useMemo(() => {
    const query = (filters.search || '').trim().toLowerCase();
    const minCap = filters.capaciteMin !== '' ? Number(filters.capaciteMin) : null;

    const list = patrimoines.filter((p) => {
      if (query) {
        const haystack = `${p.nomPatrimoine || ''} ${p.codePatrimoine || ''} ${
          p.adressePatrimoine || ''
        } ${p.descriptionPatrimoine || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (minCap !== null && !Number.isNaN(minCap)) {
        if ((p.capacitePatrimoine || 0) < minCap) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (filters.tri === 'capacite_desc') {
        return (b.capacitePatrimoine || 0) - (a.capacitePatrimoine || 0);
      }
      if (filters.tri === 'capacite_asc') {
        return (a.capacitePatrimoine || 0) - (b.capacitePatrimoine || 0);
      }
      return (a.nomPatrimoine || '').localeCompare(b.nomPatrimoine || '', 'fr');
    });
  }, [patrimoines, filters]);

  function handleResetFilters() {
    setFilters({ search: '', capaciteMin: '', tri: 'nom_asc' });
    setSearchParams({});
  }

  return (
    <div className="page-section">
      <div className="container">
        <header className="page-header">
          <h1 className="page-header__title">Sites &amp; Monuments Patrimoniaux</h1>
          <p className="page-header__subtitle">
            Découvrez les joyaux historiques, spirituels et culturels du Sénégal, de la
            presqu&apos;île du Cap-Vert aux rives de la Casamance.
          </p>
        </header>

        <FilterBar
          filters={PATRIMOINE_FILTERS}
          values={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
          resultCount={filteredPatrimoines.length}
          totalCount={patrimoines.length}
        />

        {loading && <Loader message="Chargement de la liste des patrimoines..." />}

        {!loading && error && (
          <ErrorMessage
            title="Erreur lors du chargement des patrimoines"
            message={error}
            onRetry={chargerPatrimoines}
          />
        )}

        {!loading && !error && filteredPatrimoines.length === 0 && (
          <EmptyState
            title="Aucun site patrimonial trouvé"
            description="Essayez d'élargir vos critères de recherche ou réinitialisez les filtres."
            actionLabel="Réinitialiser les filtres"
            onAction={handleResetFilters}
          />
        )}

        {!loading && !error && filteredPatrimoines.length > 0 && (
          <div className="cards-grid">
            {filteredPatrimoines.map((pat) => {
              const sobre = isLieuDeMemoire(pat);
              return (
                <Card
                  key={pat.id}
                  title={pat.nomPatrimoine}
                  description={pat.descriptionPatrimoine}
                  codePatrimoine={pat.codePatrimoine}
                  nomPatrimoineImage={pat.nomPatrimoine}
                  sobriete={sobre}
                  badges={[
                    { label: pat.codePatrimoine },
                    ...(sobre
                      ? [{ label: 'Lieu de mémoire & recueillement', variant: 'memorial' }]
                      : []),
                  ]}
                  metaItems={[
                    {
                      label: 'Adresse',
                      value: pat.adressePatrimoine || 'Non renseignée',
                    },
                    {
                      label: 'Capacité d’accueil',
                      value: `${pat.capacitePatrimoine} visiteurs`,
                    },
                  ]}
                  to={`/patrimoines/${pat.id}`}
                  actionLabel="Voir le détail"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

