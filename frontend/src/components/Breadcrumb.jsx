import { Link } from 'react-router-dom';
import './Breadcrumb.css';

/**
 * Fil d'Ariane (ex. Accueil / Patrimoines / Maison des Esclaves de Gorée).
 * @param {{ items: Array<{ label: string, to?: string }> }} props
 */
export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="breadcrumb" aria-label="Fil d'Ariane">
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="breadcrumb__item">
              {item.to && !isLast ? (
                <Link to={item.to} className="breadcrumb__link">
                  {item.label}
                </Link>
              ) : (
                <span className="breadcrumb__current" aria-current="page">
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="breadcrumb__separator" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

