import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import './Hero.css';

/**
 * Bannière d'accueil (Hero) avec grande image (/images/hero.jpg ou fond vert lumineux si absente),
 * titre, accroche chaleureuse, barre de recherche rapide et boutons vers les rubriques.
 */
export default function Hero({ title, subtitle }) {
  const [heroImgError, setHeroImgError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  function handleSearchSubmit(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/patrimoines?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/patrimoines');
    }
  }

  return (
    <section className="hero">
      {!heroImgError && (
        <img
          src="/images/hero.jpg"
          alt="Paysages et patrimoine culturel du Sénégal"
          className="hero__bg-image"
          onError={() => setHeroImgError(true)}
        />
      )}
      <div className={`hero__overlay ${heroImgError ? 'hero__overlay--fallback' : ''}`} />

      <div className="container hero__content">
        <span className="badge badge--warm hero__badge">
          Bienvenue au pays de la Teranga
        </span>
        <h1 className="hero__title">{title}</h1>
        <p className="hero__subtitle">{subtitle}</p>

        <form className="hero__search" onSubmit={handleSearchSubmit} role="search">
          <input
            type="search"
            className="hero__search-input"
            placeholder="Rechercher un site patrimonial, une ville (Gorée, Ziguinchor, Dakar...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Rechercher un patrimoine"
          />
          <Button type="submit" variant="primary" size="md">
            Rechercher
          </Button>
        </form>

        <div className="hero__actions">
          <Button to="/patrimoines" variant="primary" size="md">
            Explorer les Patrimoines
          </Button>
          <Button to="/circuits" variant="secondary" size="md">
            Parcourir les Circuits
          </Button>
          <Button to="/evenements" variant="outline" size="md">
            Agenda des Événements
          </Button>
        </div>
      </div>
    </section>
  );
}

