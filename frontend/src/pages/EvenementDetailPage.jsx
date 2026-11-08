import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvenementById, getAllEvenements } from '../api/evenements';
import { getAllPatrimoines } from '../api/patrimoines';
import {
  formatDateHeure,
  formatPrixFCFA,
  formatTypeEvenement,
  isLieuDeMemoire,
} from '../utils/formatters';
import Breadcrumb from '../components/Breadcrumb';
import PatrimoineImage from '../components/PatrimoineImage';
import InfoBox from '../components/InfoBox';
import Card from '../components/Card';
import Button from '../components/Button';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

/**
 * Page de détail d'un événement (GET /api/evenements/{id}) :
 * - Fil d'Ariane, grand titre, grande image du patrimoine lié + légende
 * - Description aérée et lien vers la fiche du patrimoine d'accueil
 * - Encadré "Informations pratiques" (dates, lieu, capacité, prix, coordonnées GPS, bouton Réserver)
 * - Section "À voir aussi" avec d'autres événements
 */
export default function EvenementDetailPage() {
  const { id } = useParams();
  const [evenement, setEvenement] = useState(null);
  const [autresEvenements, setAutresEvenements] = useState([]);
  const [patrimoinesMap, setPatrimoinesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const chargerDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, tous, patrimoinesData] = await Promise.all([
        getEvenementById(id),
        getAllEvenements().catch(() => []),
        getAllPatrimoines().catch(() => []),
      ]);
      setEvenement(detail);

      const map = {};
      if (Array.isArray(patrimoinesData)) {
        patrimoinesData.forEach((p) => {
          map[p.id] = p;
        });
      }
      setPatrimoinesMap(map);

      if (Array.isArray(tous)) {
        setAutresEvenements(
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
          <Loader message="Chargement des détails de l'événement..." />
        </div>
      </div>
    );
  }

  if (error || !evenement) {
    return (
      <div className="page-section">
        <div className="container">
          <Breadcrumb
            items={[
              { label: 'Accueil', to: '/' },
              { label: 'Événements', to: '/evenements' },
              { label: 'Événement introuvable' },
            ]}
          />
          <ErrorMessage
            title="Impossible d'afficher cet événement"
            message={error || 'Événement introuvable.'}
            onRetry={chargerDetail}
          />
        </div>
      </div>
    );
  }

  const patLie =
    evenement.patrimoine ||
    (evenement.patrimoineId ? patrimoinesMap[evenement.patrimoineId] : null);
  const sobre = isLieuDeMemoire(patLie);

  return (
    <div className="page-section">
      <div className="container">
        <Breadcrumb
          items={[
            { label: 'Accueil', to: '/' },
            { label: 'Événements', to: '/evenements' },
            { label: evenement.nomEvenement },
          ]}
        />

        <header className="detail-header">
          <div className="detail-header__badges">
            <span className={`badge ${sobre ? 'badge--memorial' : 'badge--warm'}`}>
              {formatTypeEvenement(evenement.typeEvenement)}
            </span>
            {patLie && <span className="badge">{patLie.nomPatrimoine}</span>}
          </div>
          <h1 className="detail-header__title">{evenement.nomEvenement}</h1>
        </header>

        <div className="detail-layout">
          <div>
            <figure className="detail-media">
              <div className="detail-media__image">
                <PatrimoineImage
                  codePatrimoine={patLie?.codePatrimoine}
                  nomPatrimoine={patLie?.nomPatrimoine || evenement.nomEvenement}
                  sobriete={sobre}
                />
              </div>
              <figcaption className="detail-media__caption">
                {patLie
                  ? `Site d’accueil : ${patLie.nomPatrimoine} (${
                      evenement.lieu || patLie.adressePatrimoine || 'Sénégal'
                    })`
                  : evenement.nomEvenement}
              </figcaption>
            </figure>

            <div className="detail-body">
              {sobre && (
                <div className="memorial-notice">
                  <strong>Rencontre sur un lieu de mémoire :</strong> Cet événement se
                  tient dans un espace de recueillement. Merci d&apos;observer une attitude
                  respectueuse.
                </div>
              )}

              <h2>À propos de cet événement</h2>
              <p>
                {evenement.descriptionEvenement ||
                  'Aucune description supplémentaire n’a été fournie pour cet événement.'}
              </p>

              <h2>Site patrimonial associé</h2>
              {patLie ? (
                <div>
                  <p>
                    Cet événement est organisé au sein du site{' '}
                    <Link to={`/patrimoines/${patLie.id}`}>
                      <strong>{patLie.nomPatrimoine}</strong>
                    </Link>{' '}
                    ({patLie.adressePatrimoine}).
                  </p>
                  <Button
                    to={`/patrimoines/${patLie.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Découvrir la fiche du patrimoine →
                  </Button>
                </div>
              ) : (
                <p>
                  Site patrimonial associé : identifiant #{evenement.patrimoineId}.{' '}
                  <Link to={`/patrimoines/${evenement.patrimoineId}`}>
                    Consulter la fiche
                  </Link>
                </p>
              )}
            </div>
          </div>

          <InfoBox
            title="Informations pratiques"
            sobriete={sobre}
            items={[
              {
                label: 'Catégorie',
                value: formatTypeEvenement(evenement.typeEvenement),
              },
              {
                label: 'Date de début',
                value: formatDateHeure(evenement.dateDebut),
              },
              {
                label: 'Date de fin',
                value: formatDateHeure(evenement.dateFin),
              },
              {
                label: 'Lieu',
                value: evenement.lieu || patLie?.adressePatrimoine || 'Non renseigné',
              },
              {
                label: 'Capacité maximale',
                value: `${evenement.capaciteMax} places`,
              },
              {
                label: 'Tarif d’entrée',
                value: formatPrixFCFA(evenement.prix),
              },
            ]}
            latitude={patLie?.latitudePatrimoine}
            longitude={patLie?.longitudePatrimoine}
            actionTo={`/reserver?type=EVENEMENT&evenementId=${evenement.id}`}
            actionLabel="Réserver cet événement"
          />
        </div>

        {autresEvenements.length > 0 && (
          <section className="related-section">
            <h2 className="related-section__title">À voir aussi</h2>
            <div className="cards-grid">
              {autresEvenements.map((autre) => {
                const patAutre =
                  autre.patrimoine ||
                  (autre.patrimoineId ? patrimoinesMap[autre.patrimoineId] : null);
                return (
                  <Card
                    key={autre.id}
                    title={autre.nomEvenement}
                    description={autre.descriptionEvenement}
                    codePatrimoine={patAutre?.codePatrimoine}
                    nomPatrimoineImage={patAutre?.nomPatrimoine || autre.nomEvenement}
                    badges={[
                      {
                        label: formatTypeEvenement(autre.typeEvenement),
                        variant: 'warm',
                      },
                    ]}
                    metaItems={[
                      {
                        label: 'Début',
                        value: formatDateHeure(autre.dateDebut),
                      },
                      {
                        label: 'Tarif',
                        value: formatPrixFCFA(autre.prix),
                      },
                    ]}
                    to={`/evenements/${autre.id}`}
                    actionLabel="Voir l’événement"
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

