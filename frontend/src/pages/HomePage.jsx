import { useEffect, useState, useCallback } from 'react';
import { getAllPatrimoines } from '../api/patrimoines';
import { SITE_CONFIG } from '../config';
import { isLieuDeMemoire } from '../utils/formatters';
import Hero from '../components/Hero';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './HomePage.css';

/**
 * Page d'Accueil :
 * - Grande bannière Hero avec titre, accroche, barre de recherche et boutons vers Patrimoines, Circuits, Événements
 * - Rubriques rapides de navigation (esprit éditorial au-senegal.com)
 * - Sélection de patrimoines mis en avant récupérés depuis GET /api/patrimoines
 */
export default function HomePage() {
  const [patrimoines, setPatrimoines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // On affiche jusqu'à 3 patrimoines en vedette sur l'accueil
  const featured = patrimoines.slice(0, 3);

  return (
    <div>
      <Hero
        title={SITE_CONFIG.siteName}
        subtitle="Partez à la rencontre des sites historiques, des paysages naturels de la Casamance au Cap-Vert, des circuits accompagnés et des grands rendez-vous culturels du Sénégal."
      />

      {/* Rubriques d'exploration rapide */}
      <section className="page-section home-highlights">
        <div className="container">
          <div className="home-pillars">
            <div className="home-pillar">
              <span className="badge">Sites &amp; Monuments</span>
              <h2 className="home-pillar__title">Patrimoines du Sénégal</h2>
              <p className="home-pillar__text">
                De l&apos;île de Gorée aux édifices historiques de Ziguinchor, explorez les
                trésors architecturaux, spirituels et mémoriels du pays.
              </p>
              <Button to="/patrimoines" variant="secondary" size="sm">
                Voir tous les patrimoines →
              </Button>
            </div>

            <div className="home-pillar">
              <span className="badge badge--warm">Itinéraires</span>
              <h2 className="home-pillar__title">Circuits Découverte</h2>
              <p className="home-pillar__text">
                Suivez des parcours composés d&apos;étapes ordonnées, avec durée de visite et
                distance calculées entre chaque site patrimonial.
              </p>
              <Button to="/circuits" variant="secondary" size="sm">
                Découvrir les circuits →
              </Button>
            </div>

            <div className="home-pillar">
              <span className="badge">Agenda Culturel</span>
              <h2 className="home-pillar__title">Événements &amp; Rencontres</h2>
              <p className="home-pillar__text">
                Expositions, ateliers, conférences, visites guidées et festivals organisés
                au cœur des sites patrimoniaux.
              </p>
              <Button to="/evenements" variant="secondary" size="sm">
                Consulter l&apos;agenda →
              </Button>
            </div>
          </div>

          {/* Patrimoines mis en avant */}
          <div className="home-featured-header">
            <div>
              <h2 className="home-featured-header__title">
                Patrimoines emblématiques à découvrir
              </h2>
              <p className="home-featured-header__subtitle">
                Sélection de lieux incontournables de notre patrimoine national
              </p>
            </div>
            <Button to="/patrimoines" variant="outline" size="sm">
              Tout le catalogue ({patrimoines.length})
            </Button>
          </div>

          {loading && <Loader message="Chargement des patrimoines mis en avant..." />}

          {!loading && error && (
            <ErrorMessage
              title="Impossible de charger les patrimoines"
              message={error}
              onRetry={chargerPatrimoines}
            />
          )}

          {!loading && !error && featured.length === 0 && (
            <EmptyState
              title="Aucun patrimoine enregistré"
              description="La base de données ne contient aucun site patrimonial pour le moment."
            />
          )}

          {!loading && !error && featured.length > 0 && (
            <div className="cards-grid">
              {featured.map((pat) => {
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
                        ? [{ label: 'Lieu de mémoire', variant: 'memorial' }]
                        : []),
                    ]}
                    metaItems={[
                      {
                        label: 'Lieu',
                        value: pat.adressePatrimoine || 'Sénégal',
                      },
                      {
                        label: 'Capacité',
                        value: `${pat.capacitePatrimoine} personnes`,
                      },
                    ]}
                    to={`/patrimoines/${pat.id}`}
                    actionLabel="Lire la fiche"
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

