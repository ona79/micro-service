import Button from './Button';
import './Feedback.css';

/** Bloc affiché lorsqu'une liste est vide ou qu'aucun résultat ne correspond aux filtres */
export default function EmptyState({
  title = 'Aucun élément trouvé',
  description = 'Aucun contenu ne correspond actuellement à votre recherche.',
  actionLabel,
  onAction,
  actionTo,
}) {
  return (
    <div className="feedback-box feedback-box--empty">
      <h3 className="feedback-box__title">{title}</h3>
      <p className="feedback-box__text">{description}</p>
      {(onAction || actionTo) && (
        <div className="feedback-box__actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAction}
            to={actionTo}
          >
            {actionLabel || 'Voir tout'}
          </Button>
        </div>
      )}
    </div>
  );
}

