import { Link } from 'react-router-dom';
import PatrimoineImage from './PatrimoineImage';
import Button from './Button';
import './Card.css';

/**
 * Carte réutilisable aux coins arrondis (16px) avec grande image, badges, titre,
 * courte description, métadonnées et bouton d'action.
 */
export default function Card({
  title,
  description,
  codePatrimoine,
  nomPatrimoineImage,
  sobriete = false,
  badges = [],
  metaItems = [],
  to,
  actionLabel = 'Découvrir',
}) {
  return (
    <article className={`card ${sobriete ? 'card--sobre' : ''}`}>
      <Link to={to} className="card__media-link" aria-label={title}>
        <div className="card__media">
          <PatrimoineImage
            codePatrimoine={codePatrimoine}
            nomPatrimoine={nomPatrimoineImage || title}
            sobriete={sobriete}
          />
        </div>
      </Link>

      <div className="card__body">
        {badges.length > 0 && (
          <div className="card__badges">
            {badges.map((badge, idx) => (
              <span
                key={idx}
                className={`badge ${badge.variant ? `badge--${badge.variant}` : ''}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        <h3 className="card__title">
          <Link to={to}>{title}</Link>
        </h3>

        {description && <p className="card__description">{description}</p>}

        {metaItems.length > 0 && (
          <ul className="card__meta">
            {metaItems.map((meta, idx) => (
              <li key={idx} className="card__meta-item">
                <span className="card__meta-label">{meta.label} :</span>{' '}
                <strong className="card__meta-value">{meta.value}</strong>
              </li>
            ))}
          </ul>
        )}

        <div className="card__footer">
          <Button to={to} variant="secondary" size="sm">
            {actionLabel} →
          </Button>
        </div>
      </div>
    </article>
  );
}

