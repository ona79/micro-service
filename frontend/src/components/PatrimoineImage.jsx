import { useState, useEffect } from 'react';
import './PatrimoineImage.css';

/**
 * Affiche l'image d'un patrimoine depuis /images/patrimoines/<codePatrimoine>.jpg.
 * Si le fichier n'existe pas ou si codePatrimoine est absent, affiche un bloc vert clair
 * de remplacement avec le nom du patrimoine.
 */
export default function PatrimoineImage({
  codePatrimoine,
  nomPatrimoine = 'Patrimoine culturel',
  className = '',
  sobriete = false,
}) {
  const [imageError, setImageError] = useState(false);

  // Réinitialise l'état d'erreur si le code du patrimoine change
  useEffect(() => {
    setImageError(false);
  }, [codePatrimoine]);

  const hasValidCode = Boolean(codePatrimoine && String(codePatrimoine).trim());
  const imageSrc = hasValidCode ? `/images/patrimoines/${codePatrimoine.trim()}.jpg` : '';

  if (!hasValidCode || imageError) {
    return (
      <div
        className={`patrimoine-image-fallback ${sobriete ? 'patrimoine-image-fallback--sobre' : ''} ${className}`}
        role="img"
        aria-label={nomPatrimoine}
      >
        <div className="patrimoine-image-fallback__content">
          {hasValidCode && (
            <span className="patrimoine-image-fallback__code">{codePatrimoine}</span>
          )}
          <span className="patrimoine-image-fallback__title">{nomPatrimoine}</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={nomPatrimoine}
      className={`patrimoine-image ${className}`}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  );
}

