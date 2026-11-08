import { useEffect, useState, useMemo, useCallback } from 'react';
import { getAllCircuits } from '../api/circuits';
import { getAllPatrimoines } from '../api/patrimoines';
import {
  formatDifficulte,
  formatDureeMinutes,
  formatPrixFCFA,
} from '../utils/formatters';
import FilterBar from '../components/FilterBar';
import Card from '../components/Card';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

// Configuration des filtres de la page Circuits (d'après CircuitDto)
const CIRCUIT_FILTERS = [
  {
    key: 'search',
    label: 'Recherche par nom ou description',
    type: 'search',
    placeholder: 'Ex: Casamance, Dakar, historique...',
  },
  {
    key: 'difficulte',
    label: 'Difficulté',
    type: 'select',
    options: [
      { value: '', label: 'Toutes les difficultés' },
      { value: 'FACILE', label: 'Facile' },
      { value: 'MOYEN', label: 'Modéré (Moyen)' },
      { value: 'DIFFICILE', label: 'Sportif (Difficile)' },
    ],
  },
  {
    key: 'dureeMax',
    label: 'Durée maximale (minutes)',
    type: 'number',
    placeholder: 'Ex: 180',
    min: 0,
    step: 30,
  },
  {
    key: 'distanceMax',
    label: 'Distance maximale (km)',
    type: 'number',
    placeholder: 'Ex: 50',
    min: 0,
    step: 5,
  },
];

/**
 * Page de liste des Circuits touristiques (GET /api/circuits).
 * Utilise l'image du premier patrimoine lié au circuit (ou le bloc vert clair de remplacement).
 */
export default function CircuitsPage() {
  const [circuits, setCircuits] = useState([]);
  const [patrimoinesMap, setPatrimoinesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    difficulte: '',
    dureeMax: '',
    distanceMax: '',
  });

  const chargerCircuits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [circuitsData, patrimoinesData] = await Promise.all([
        getAllCircuits(),
        getAllPatrimoines().catch(() => []),
      ]);
      setCircuits(Array.isArray(circuitsData) ? circuitsData : []);

      // Dictionnaire id -> patrimoine pour résoudre l'image de la 1re étape
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
    chargerCircuits();
  }, [chargerCircuits]);

  const filteredCircuits = useMemo(() => {
    const q = (filters.search || '').trim().toLowerCase();
    const diff = filters.difficulte;
    const maxDuree = filters.dureeMax !== '' ? Number(filters.dureeMax) : null;
    const maxDist = filters.distanceMax !== '' ? Number(filters.distanceMax) : null;

    return circuits.filter((c) => {
      if (q) {
        const text = `${c.nomCircuit || ''} ${c.descriptionCircuit || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (diff && c.difficulte !== diff) return false;
      if (maxDuree !== null && !Number.isNaN(maxDuree)) {
        if ((c.dureeEstimee || 0) > maxDuree) return false;
      }
      if (maxDist !== null && !Number.isNaN(maxDist)) {
        if ((c.distanceTotale || 0) > maxDist) return false;
      }
      return true;
    });
  }, [circuits, filters]);

  function handleReset() {
    setFilters({ search: '', difficulte: '', dureeMax: '', distanceMax: '' });
  }

  return (
    <div className="page-section">
      <div className="container">
        <header className="page-header">
          <h1 className="page-header__title">Circuits &amp; Parcours Touristiques</h1>
          <p className="page-header__subtitle">
            Parcourez nos itinéraires thématiques reliant plusieurs sites patrimoniaux,
            avec calcul automatique des temps de visite et des distances.
          </p>
        </header>

        <FilterBar
          filters={CIRCUIT_FILTERS}
          values={filters}
          onChange={setFilters}
          onReset={handleReset}
          resultCount={filteredCircuits.length}
          totalCount={circuits.length}
        />

        {loading && <Loader message="Chargement des circuits touristiques..." />}

        {!loading && error && (
          <ErrorMessage
            title="Erreur lors du chargement des circuits"
            message={error}
            onRetry={chargerCircuits}
          />
        )}

        {!loading && !error && filteredCircuits.length === 0 && (
          <EmptyState
            title="Aucun circuit disponible"
            description="Aucun circuit ne correspond aux filtres sélectionnés ou aucun parcours n'a encore été créé."
            actionLabel="Réinitialiser les filtres"
            onAction={handleReset}
          />
        )}

        {!loading && !error && filteredCircuits.length > 0 && (
          <div className="cards-grid">
            {filteredCircuits.map((circuit) => {
              const etapesTriees = [...(circuit.etapes || [])].sort(
                (a, b) => (a.ordre || 0) - (b.ordre || 0)
              );
              const premiereEtape = etapesTriees[0];
              const patLie =
                premiereEtape?.patrimoine ||
                (premiereEtape?.patrimoineId
                  ? patrimoinesMap[premiereEtape.patrimoineId]
                  : null);

              return (
                <Card
                  key={circuit.id}
                  title={circuit.nomCircuit}
                  description={circuit.descriptionCircuit}
                  codePatrimoine={patLie?.codePatrimoine}
                  nomPatrimoineImage={patLie?.nomPatrimoine || circuit.nomCircuit}
                  badges={[
                    {
                      label: `Difficulté : ${formatDifficulte(circuit.difficulte)}`,
                      variant: 'warm',
                    },
                    {
                      label: `${etapesTriees.length} étape${
                        etapesTriees.length > 1 ? 's' : ''
                      }`,
                    },
                  ]}
                  metaItems={[
                    {
                      label: 'Durée estimée',
                      value: formatDureeMinutes(circuit.dureeEstimee),
                    },
                    {
                      label: 'Distance',
                      value: `${circuit.distanceTotale || 0} km`,
                    },
                    {
                      label: 'Tarif',
                      value: formatPrixFCFA(circuit.prix),
                    },
                  ]}
                  to={`/circuits/${circuit.id}`}
                  actionLabel="Voir l’itinéraire"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

