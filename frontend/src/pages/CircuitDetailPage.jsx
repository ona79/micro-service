import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCircuitById, getAllCircuits } from '../api/circuits';
import { getAllPatrimoines } from '../api/patrimoines';
import {
  formatDifficulte,
  formatDureeMinutes,
  formatPrixFCFA,
} from '../utils/formatters';
import Breadcrumb from '../components/Breadcrumb';
import PatrimoineImage from '../components/PatrimoineImage';
import InfoBox from '../components/InfoBox';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import './CircuitDetailPage.css';

/**
 * Page de détail d'un circuit (GET /api/circuits/{id}) :
 * - Fil d'Ariane, grand titre, grande image du patrimoine principal + légende
 * - Description + liste ordonnée des étapes avec liens vers les patrimoines
 * - Encadré "Informations pratiques" avec bouton Réserver ce circuit
 * - Section "À voir aussi" avec les autres circuits
 */
export default function CircuitDetailPage() {
  const { id } = useParams();
  const [circuit, setCircuit] = useState(null);
  const [autresCircuits, setAutresCircuits] = useState([]);
  const [patrimoinesMap, setPatrimoinesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const chargerDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, tous, patrimoinesData] = await Promise.all([
        getCircuitById(id),
        getAllCircuits().catch(() => []),
        getAllPatrimoines().catch(() => []),
      ]);
      setCircuit(detail);

      const map = {};
      if (Array.isArray(patrimoinesData)) {
        patrimoinesData.forEach((p) => {
          map[p.id] = p;
        });
      }
      setPatrimoinesMap(map);

      if (Array.isArray(tous)) {
        setAutresCircuits(
          tous.filter((item) => String(item.id) !== String(id)).slice(0, 3)
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    chargerDetail();
  }, [chargerDetail]);

  if (loading) {
    return (
      <div className="page-section">
        <div className="container">
          <Loader message="Chargement de l'itinéraire du circuit..." />
        </div>
      </div>
    );
  }

  if (error || !circuit) {
    return (
      <div className="page-section">
        <div className="container">
          <Breadcrumb
            items={[
              { label: 'Accueil', to: '/' },
              { label: 'Circuits', to: '/circuits' },
              { label: 'Circuit introuvable' },
            ]}
          />
          <ErrorMessage
            title="Impossible d'afficher ce circuit"
            message={error || 'Circuit introuvable.'}
            onRetry={chargerDetail}
          />
        </div>
      </div>
    );
  }

  // Tri des étapes dans l'ordre croissant (champ `ordre`)
  const etapesOrdonnees = [...(circuit.etapes || [])].sort(
    (a, b) => (a.ordre || 0) - (b.ordre || 0)
  );

  const premiereEtape = etapesOrdonnees[0];
  const patrimoinePrincipal =
    premiereEtape?.patrimoine ||
    (premiereEtape?.patrimoineId ? patrimoinesMap[premiereEtape.patrimoineId] : null);

  return (
    <div className="page-section">
      <div className="container">
        <Breadcrumb
          items={[
            { label: 'Accueil', to: '/' },
            { label: 'Circuits', to: '/circuits' },
            { label: circuit.nomCircuit },
          ]}
        />

        <header className="detail-header">
          <div className="detail-header__badges">
            <span className="badge badge--warm">
              Difficulté : {formatDifficulte(circuit.difficulte)}
            </span>
            <span className="badge">
              {etapesOrdonnees.length} étape{etapesOrdonnees.length > 1 ? 's' : ''}
            </span>
            <span className="badge">{formatDureeMinutes(circuit.dureeEstimee)}</span>
          </div>
          <h1 className="detail-header__title">{circuit.nomCircuit}</h1>
        </header>

        <div className="detail-layout">
          <div>
            <figure className="detail-media">
              <div className="detail-media__image">
                <PatrimoineImage
                  codePatrimoine={patrimoinePrincipal?.codePatrimoine}
                  nomPatrimoine={
                    patrimoinePrincipal?.nomPatrimoine || circuit.nomCircuit
                  }
                />
              </div>
              <figcaption className="detail-media__caption">
                {patrimoinePrincipal
                  ? `Étape de départ : ${patrimoinePrincipal.nomPatrimoine} (${patrimoinePrincipal.adressePatrimoine || 'Sénégal'})`
                  : circuit.nomCircuit}
              </figcaption>
            </figure>

            <div className="detail-body">
              <h2>Présentation du parcours</h2>
              <p>
                {circuit.descriptionCircuit ||
                  'Ce circuit vous emmène à la découverte de plusieurs sites patrimoniaux majeurs.'}
              </p>

              <h2>Étapes du circuit dans l&apos;ordre de visite</h2>
              {etapesOrdonnees.length === 0 ? (
                <p>Aucune étape n&apos;est renseignée pour ce circuit.</p>
              ) : (
                <ol className="circuit-steps">
                  {etapesOrdonnees.map((etape) => {
                    const pat =
                      etape.patrimoine || patrimoinesMap[etape.patrimoineId] || null;
                    return (
                      <li key={etape.id || etape.ordre} className="circuit-step">
                        <div className="circuit-step__badge">Étape {etape.ordre}</div>
                        <div className="circuit-step__content">
                          <h3 className="circuit-step__title">
                            {pat ? (
                              <Link to={`/patrimoines/${etape.patrimoineId}`}>
                                {pat.nomPatrimoine}
                              </Link>
                            ) : (
                              <Link to={`/patrimoines/${etape.patrimoineId}`}>
                                Patrimoine #{etape.patrimoineId}
                              </Link>
                            )}
                          </h3>
                          {pat?.adressePatrimoine && (
                            <p className="circuit-step__location">
                              Localisation : {pat.adressePatrimoine}
                            </p>
                          )}
                          {pat?.descriptionPatrimoine && (
                            <p className="circuit-step__desc">
                              {pat.descriptionPatrimoine}
                            </p>
                          )}
                          <div className="circuit-step__footer">
                            <span className="badge">
                              Durée sur place : {formatDureeMinutes(etape.dureeVisite)}
                            </span>
                            <Button
                              to={`/patrimoines/${etape.patrimoineId}`}
                              variant="secondary"
                              size="sm"
                            >
                              Voir la fiche du patrimoine →
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>

          <InfoBox
            title="Informations pratiques"
            items={[
              {
                label: 'Difficulté',
                value: formatDifficulte(circuit.difficulte),
              },
              {
                label: 'Durée totale estimée',
                value: formatDureeMinutes(circuit.dureeEstimee),
              },
              {
                label: 'Distance totale',
                value: `${circuit.distanceTotale || 0} km`,
              },
              {
                label: 'Capacité du groupe',
                value: `${circuit.placesMax} places maximum`,
              },
              {
                label: 'Tarif par personne',
                value: formatPrixFCFA(circuit.prix),
              },
            ]}
            latitude={patrimoinePrincipal?.latitudePatrimoine}
            longitude={patrimoinePrincipal?.longitudePatrimoine}
            actionTo={`/reserver?type=CIRCUIT&circuitId=${circuit.id}`}
            actionLabel="Réserver ce circuit"
          />
        </div>

        {autresCircuits.length > 0 && (
          <section className="related-section">
            <h2 className="related-section__title">À voir aussi</h2>
            <div className="cards-grid">
              {autresCircuits.map((autre) => {
                const prem = [...(autre.etapes || [])].sort(
                  (a, b) => (a.ordre || 0) - (b.ordre || 0)
                )[0];
                const patAutre =
                  prem?.patrimoine ||
                  (prem?.patrimoineId ? patrimoinesMap[prem.patrimoineId] : null);
                return (
                  <Card
                    key={autre.id}
                    title={autre.nomCircuit}
                    description={autre.descriptionCircuit}
                    codePatrimoine={patAutre?.codePatrimoine}
                    nomPatrimoineImage={patAutre?.nomPatrimoine || autre.nomCircuit}
                    badges={[
                      {
                        label: formatDifficulte(autre.difficulte),
                        variant: 'warm',
                      },
                    ]}
                    metaItems={[
                      {
                        label: 'Durée',
                        value: formatDureeMinutes(autre.dureeEstimee),
                      },
                      {
                        label: 'Tarif',
                        value: formatPrixFCFA(autre.prix),
                      },
                    ]}
                    to={`/circuits/${autre.id}`}
                    actionLabel="Voir l’itinéraire"
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

