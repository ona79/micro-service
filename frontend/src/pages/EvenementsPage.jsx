import { useEffect, useState, useMemo, useCallback } from 'react';
import { getAllEvenements } from '../api/evenements';
import { getAllPatrimoines } from '../api/patrimoines';
import {
  formatDateHeure,
  formatPrixFCFA,
  formatTypeEvenement,
  isLieuDeMemoire,
} from '../utils/formatters';
import FilterBar from '../components/FilterBar';
import Card from '../components/Card';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

// Configuration des filtres de la page Événements (d'après EvenementDto)
const EVENEMENT_FILTERS = [
  {
    key: 'search',
    label: 'Recherche (nom, lieu, description)',
    type: 'search',
    placeholder: 'Ex: Exposition, Gorée, Festival...',
  },
  {
    key: 'typeEvenement',
    label: "Type d'événement",
    type: 'select',
    options: [
      { value: '', label: 'Tous les types' },
      { value: 'EXPOSITION', label: 'Exposition' },
      { value: 'ATELIER', label: 'Atelier culturel' },
      { value: 'VISITE_GUIDEE', label: 'Visite guidée' },
      { value: 'CONFERENCE', label: 'Conférence' },
      { value: 'FESTIVAL', label: 'Festival' },
    ],
  },
  {
    key: 'dateMin',
    label: 'À partir du',
    type: 'date',
  },
];

/**
 * Page de liste des Événements (GET /api/evenements) avec barre de recherche et filtres côté front.
 * Utilise l'image du patrimoine lié ou le bloc vert clair de remplacement.
 */
export default function EvenementsPage() {
  const [evenements, setEvenements] = useState([]);
  const [patrimoinesMap, setPatrimoinesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    typeEvenement: '',
    dateMin: '',
  });

  const chargerEvenements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evtsData, patrimoinesData] = await Promise.all([
        getAllEvenements(),
        getAllPatrimoines().catch(() => []),
      ]);
      setEvenements(Array.isArray(evtsData) ? evtsData : []);

      const map = {};
      if (Array.isArray(patrimoinesData)) {
        patrimoinesData.forEach((p) => {
          map[p.id] = p;
        });
      }
      setPatrimoinesMap(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerEvenements();
  }, [chargerEvenements]);

  const filteredEvenements = useMemo(() => {
    const q = (filters.search || '').trim().toLowerCase();
    const type = filters.typeEvenement;
    const dateMin = filters.dateMin ? new Date(filters.dateMin) : null;

    return evenements.filter((ev) => {
      if (q) {
        const text = `${ev.nomEvenement || ''} ${ev.descriptionEvenement || ''} ${
          ev.lieu || ''
        }`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (type && ev.typeEvenement !== type) return false;
      if (dateMin && !Number.isNaN(dateMin.getTime()) && ev.dateDebut) {
        const dFin = ev.dateFin ? new Date(ev.dateFin) : new Date(ev.dateDebut);
        if (dFin < dateMin) return false;
      }
      return true;
    });
  }, [evenements, filters]);

  function handleReset() {
    setFilters({ search: '', typeEvenement: '', dateMin: '' });
  }

  return (
    <div className="page-section">
      <div className="container">
        <header className="page-header">
          <h1 className="page-header__title">Agenda des Événements Culturels</h1>
          <p className="page-header__subtitle">
            Expositions, ateliers, conférences, visites guidées et festivals organisés au
            sein des sites patrimoniaux du Sénégal.
          </p>
        </header>

        <FilterBar
          filters={EVENEMENT_FILTERS}
          values={filters}
          onChange={setFilters}
          onReset={handleReset}
          resultCount={filteredEvenements.length}
          totalCount={evenements.length}
        />

        {loading && <Loader message="Chargement des événements culturels..." />}

        {!loading && error && (
          <ErrorMessage
            title="Erreur lors du chargement des événements"
            message={error}
            onRetry={chargerEvenements}
          />
        )}

        {!loading && !error && filteredEvenements.length === 0 && (
          <EmptyState
            title="Aucun événement programmé"
            description="Aucun événement ne correspond à vos filtres ou aucun rendez-vous n'est encore inscrit à l'agenda."
            actionLabel="Réinitialiser les filtres"
            onAction={handleReset}
          />
        )}

        {!loading && !error && filteredEvenements.length > 0 && (
          <div className="cards-grid">
            {filteredEvenements.map((ev) => {
              const patLie =
                ev.patrimoine || (ev.patrimoineId ? patrimoinesMap[ev.patrimoineId] : null);
              const sobre = isLieuDeMemoire(patLie);

              return (
                <Card
                  key={ev.id}
                  title={ev.nomEvenement}
                  description={ev.descriptionEvenement}
                  codePatrimoine={patLie?.codePatrimoine}
                  nomPatrimoineImage={patLie?.nomPatrimoine || ev.nomEvenement}
                  sobriete={sobre}
                  badges={[
                    {
                      label: formatTypeEvenement(ev.typeEvenement),
                      variant: sobre ? 'memorial' : 'warm',
                    },
                    ...(patLie ? [{ label: patLie.nomPatrimoine }] : []),
                  ]}
                  metaItems={[
                    {
                      label: 'Début',
                      value: formatDateHeure(ev.dateDebut),
                    },
                    {
                      label: 'Lieu',
                      value: ev.lieu || patLie?.adressePatrimoine || 'Sénégal',
                    },
                    {
                      label: 'Tarif',
                      value: formatPrixFCFA(ev.prix),
                    },
                  ]}
                  to={`/evenements/${ev.id}`}
                  actionLabel="Voir l’événement"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

