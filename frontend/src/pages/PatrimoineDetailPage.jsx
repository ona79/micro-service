import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getPatrimoineById, getAllPatrimoines } from '../api/patrimoines';
import { isLieuDeMemoire } from '../utils/formatters';
import Breadcrumb from '../components/Breadcrumb';
import PatrimoineImage from '../components/PatrimoineImage';
import InfoBox from '../components/InfoBox';
import Card from '../components/Card';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

/**
 * Page de détail d'un patrimoine (GET /api/patrimoines/{id}) inspirée de au-senegal.com :
 * - Fil d'Ariane (Accueil / Patrimoines / nom)
 * - Grand titre + badges
 * - Grande image + légende sous l'image
 * - Texte aéré (Description + Historique)
 * - Encadré "Informations pratiques" (adresse, capacité, coordonnées GPS avec lien carte, bouton Réserver)
 * - Section "À voir aussi" avec d'autres patrimoines
 */
export default function PatrimoineDetailPage() {
  const { id } = useParams();
  const [patrimoine, setPatrimoine] = useState(null);
  const [autresPatrimoines, setAutresPatrimoines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const chargerDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, tous] = await Promise.all([
        getPatrimoineById(id),
        getAllPatrimoines().catch(() => []),
      ]);
      setPatrimoine(detail);
      if (Array.isArray(tous)) {
        setAutresPatrimoines(
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
          <Loader message="Chargement de la fiche du patrimoine..." />
        </div>
      </div>
    );
  }

  if (error || !patrimoine) {
    return (
      <div className="page-section">
        <div className="container">
          <Breadcrumb
            items={[
              { label: 'Accueil', to: '/' },
              { label: 'Patrimoines', to: '/patrimoines' },
              { label: 'Fiche introuvable' },
            ]}
          />
          <ErrorMessage
            title="Impossible d'afficher ce site patrimonial"
            message={error || 'Patrimoine introuvable.'}
            onRetry={chargerDetail}
          />
        </div>
      </div>
    );
  }

  const sobre = isLieuDeMemoire(patrimoine);

  return (
    <div className="page-section">
      <div className="container">
        <Breadcrumb
          items={[
            { label: 'Accueil', to: '/' },
            { label: 'Patrimoines', to: '/patrimoines' },
            { label: patrimoine.nomPatrimoine },
          ]}
        />

        <header className="detail-header">
          <div className="detail-header__badges">
            <span className="badge">{patrimoine.codePatrimoine}</span>
            {sobre ? (
              <span className="badge badge--memorial">
                Lieu de mémoire et de recueillement
              </span>
            ) : (
              <span className="badge badge--warm">Patrimoine culturel</span>
            )}
          </div>
          <h1 className="detail-header__title">{patrimoine.nomPatrimoine}</h1>
        </header>

        <div className="detail-layout">
          <div>
            <figure className="detail-media">
              <div className="detail-media__image">
                <PatrimoineImage
                  codePatrimoine={patrimoine.codePatrimoine}
                  nomPatrimoine={patrimoine.nomPatrimoine}
                  sobriete={sobre}
                />
              </div>
              <figcaption className="detail-media__caption">
                {patrimoine.nomPatrimoine} — {patrimoine.adressePatrimoine || 'Sénégal'} (Code :{' '}
                {patrimoine.codePatrimoine})
              </figcaption>
            </figure>

            <div className="detail-body">
              {sobre && (
                <div className="memorial-notice">
                  <strong>Lieu de recueillement :</strong> Ce site honore une mémoire
                  historique et humaine profonde. Les visites s&apos;y déroulent dans le calme,
                  la dignité et le respect.
                </div>
              )}

              <h2>Présentation du site</h2>
              <p>
                {patrimoine.descriptionPatrimoine ||
                  'Aucune description détaillée n’est encore renseignée pour ce site patrimonial.'}
              </p>

              {patrimoine.historiquePatrimoine && (
                <>
                  <h2>Repères historiques</h2>
                  <p>{patrimoine.historiquePatrimoine}</p>
                </>
              )}
            </div>
          </div>

          <InfoBox
            title="Informations pratiques"
            sobriete={sobre}
            items={[
              {
                label: 'Code officiel',
                value: patrimoine.codePatrimoine,
              },
              {
                label: 'Adresse / Localisation',
                value: patrimoine.adressePatrimoine || 'Non renseignée',
              },
              {
                label: 'Capacité maximale',
                value: `${patrimoine.capacitePatrimoine} personnes`,
              },
            ]}
            latitude={patrimoine.latitudePatrimoine}
            longitude={patrimoine.longitudePatrimoine}
            actionTo="/reserver"
            actionLabel="Réserver un circuit ou événement"
          />
        </div>

        {autresPatrimoines.length > 0 && (
          <section className="related-section">
            <h2 className="related-section__title">À voir aussi</h2>
            <div className="cards-grid">
              {autresPatrimoines.map((autre) => {
                const autreSobre = isLieuDeMemoire(autre);
                return (
                  <Card
                    key={autre.id}
                    title={autre.nomPatrimoine}
                    description={autre.descriptionPatrimoine}
                    codePatrimoine={autre.codePatrimoine}
                    nomPatrimoineImage={autre.nomPatrimoine}
                    sobriete={autreSobre}
                    badges={[{ label: autre.codePatrimoine }]}
                    metaItems={[
                      { label: 'Adresse', value: autre.adressePatrimoine || 'Sénégal' },
                      {
                        label: 'Capacité',
                        value: `${autre.capacitePatrimoine} visiteurs`,
                      },
                    ]}
                    to={`/patrimoines/${autre.id}`}
                    actionLabel="Lire la fiche"
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

