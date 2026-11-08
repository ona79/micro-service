import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { SITE_CONFIG } from '../config';
import './Layout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/patrimoines', label: 'Patrimoines' },
  { to: '/circuits', label: 'Circuits' },
  { to: '/evenements', label: 'Événements' },
  { to: '/reserver', label: 'Réserver' },
];

/**
 * Mise en page globale inspirée de la disposition éditoriale de au-senegal.com :
 * - En-tête : nom du site + petit slogan, barre de recherche rapide, menu horizontal de rubriques,
 *   menu burger sur téléphone.
 * - Contenu principal (<Outlet />)
 * - Pied de page en colonnes (navigation, à propos du projet, identité académique UASZ sans logo).
 */
export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const navigate = useNavigate();

  function handleHeaderSearchSubmit(e) {
    e.preventDefault();
    const q = headerSearch.trim();
    setMenuOpen(false);
    if (q) {
      navigate(`/patrimoines?q=${encodeURIComponent(q)}`);
      setHeaderSearch('');
    } else {
      navigate('/patrimoines');
    }
  }

  return (
    <div className="site-wrapper">
      <header className="site-header">
        {/* Bandeau supérieur : Identité du site + Barre de recherche + Bouton Burger */}
        <div className="site-header__top">
          <div className="container site-header__top-inner">
            <Link
              to="/"
              className="site-brand"
              onClick={() => setMenuOpen(false)}
            >
              <span className="site-brand__name">{SITE_CONFIG.siteName}</span>
              <span className="site-brand__slogan">{SITE_CONFIG.siteSlogan}</span>
            </Link>

            <form
              className="site-header__search"
              onSubmit={handleHeaderSearchSubmit}
              role="search"
            >
              <input
                type="search"
                className="site-header__search-input"
                placeholder="Rechercher un lieu, un patrimoine..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                aria-label="Rechercher sur le site"
              />
              <button type="submit" className="site-header__search-btn">
                Rechercher
              </button>
            </form>

            <button
              type="button"
              className="site-header__burger"
              aria-expanded={menuOpen}
              aria-label="Ouvrir ou fermer le menu de navigation"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span className="site-header__burger-bar" />
              <span className="site-header__burger-bar" />
              <span className="site-header__burger-bar" />
            </button>
          </div>
        </div>

        {/* Barre horizontale des rubriques */}
        <nav
          className={`site-nav ${menuOpen ? 'site-nav--open' : ''}`}
          aria-label="Navigation principale"
        >
          <div className="container site-nav__inner">
            <ul className="site-nav__list">
              {NAV_ITEMS.map((item) => (
                <li key={item.to} className="site-nav__item">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `site-nav__link ${isActive ? 'site-nav__link--active' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer__grid">
          <div className="site-footer__col">
            <h3 className="site-footer__heading">{SITE_CONFIG.siteName}</h3>
            <p className="site-footer__text">
              Plateforme dédiée à la découverte des sites patrimoniaux, des circuits de
              visite et des événements culturels à travers les régions du Sénégal, de
              Dakar à la Casamance.
            </p>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__heading">Rubriques</h3>
            <ul className="site-footer__links">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__heading">À propos du projet</h3>
            <p className="site-footer__text site-footer__text--strong">
              {SITE_CONFIG.universite.nom}
            </p>
            <p className="site-footer__text">{SITE_CONFIG.universite.cours}</p>
          </div>
        </div>

        <div className="site-footer__bottom">
          <div className="container">
            <p>
              {SITE_CONFIG.siteName} — Architecture Microservices Spring Boot &amp;
              React
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

