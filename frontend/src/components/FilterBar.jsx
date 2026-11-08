import Button from './Button';
import './FilterBar.css';

/**
 * Barre de recherche et de filtres réutilisable, pilotée par une configuration par page.
 *
 * Chaque filtre dans `filters` possède :
 * - key: identifiant dans l'objet values
 * - label: libellé affiché au-dessus du champ
 * - type: 'search' | 'select' | 'number' | 'date'
 * - placeholder?: texte indicatif
 * - options?: Array<{ value: string, label: string }> (pour type === 'select')
 * - min?: number, step?: number (pour type === 'number')
 */
export default function FilterBar({
  filters = [],
  values = {},
  onChange,
  onReset,
  resultCount,
  totalCount,
}) {
  function handleFieldChange(key, newValue) {
    if (onChange) {
      onChange({
        ...values,
        [key]: newValue,
      });
    }
  }

  return (
    <section className="filter-bar" aria-label="Filtres et recherche">
      <div className="filter-bar__grid">
        {filters.map((filter) => {
          const id = `filter-${filter.key}`;
          const val = values[filter.key] ?? '';

          return (
            <div
              key={filter.key}
              className={`filter-bar__field ${
                filter.type === 'search' ? 'filter-bar__field--search' : ''
              }`}
            >
              <label htmlFor={id} className="filter-bar__label">
                {filter.label}
              </label>

              {filter.type === 'select' ? (
                <select
                  id={id}
                  className="filter-bar__control"
                  value={val}
                  onChange={(e) => handleFieldChange(filter.key, e.target.value)}
                >
                  {(filter.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={filter.type === 'search' ? 'search' : filter.type || 'text'}
                  className="filter-bar__control"
                  placeholder={filter.placeholder || ''}
                  min={filter.min}
                  step={filter.step}
                  value={val}
                  onChange={(e) => handleFieldChange(filter.key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="filter-bar__footer">
        {typeof resultCount === 'number' && (
          <p className="filter-bar__count">
            <strong>{resultCount}</strong> résultat{resultCount > 1 ? 's' : ''} affiché
            {resultCount > 1 ? 's' : ''}
            {typeof totalCount === 'number' && totalCount !== resultCount
              ? ` sur ${totalCount}`
              : ''}
          </p>
        )}

        {onReset && (
          <Button variant="secondary" size="sm" onClick={onReset}>
            Réinitialiser les filtres
          </Button>
        )}
      </div>
    </section>
  );
}

