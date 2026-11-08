import Button from './Button';
import './InfoBox.css';

/**
 * Encadré "Informations pratiques" affiché sur les pages de détail.
 * Affiche une liste de lignes (label / valeur), un lien OpenStreetMap si latitude et longitude
 * sont renseignées, et un bouton d'action (ex. Réserver).
 */
export default function InfoBox({
  title = 'Informations pratiques',
  items = [],
  latitude,
  longitude,
  actionTo,
  actionLabel = 'Réserver',
  sobriete = false,
}) {
  const hasCoordinates =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    (Number(latitude) !== 0 || Number(longitude) !== 0);

  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`
    : null;

  return (
    <aside className={`info-box ${sobriete ? 'info-box--sobre' : ''}`}>
      <h2 className="info-box__title">{title}</h2>

      <dl className="info-box__list">
        {items.map((item, idx) => (
          <div key={idx} className="info-box__row">
            <dt className="info-box__term">{item.label}</dt>
            <dd className="info-box__desc">{item.value || 'Non renseigné'}</dd>
          </div>
        ))}

        {hasCoordinates && (
          <div className="info-box__row">
            <dt className="info-box__term">Coordonnées GPS</dt>
            <dd className="info-box__desc">
              <span>
                {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
              </span>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="info-box__map-link"
              >
                Voir sur la carte interactive ↗
              </a>
            </dd>
          </div>
        )}
      </dl>

      {actionTo && (
        <div className="info-box__actions">
          <Button
            to={actionTo}
            variant="primary"
            size="md"
            className="info-box__cta"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </aside>
  );
}

