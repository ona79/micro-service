import Button from './Button';
import './Feedback.css';

/** Affiche clairement le message d'erreur renvoyé par le back-end */
export default function ErrorMessage({
  title = 'Une erreur est survenue',
  message,
  onRetry,
}) {
  if (!message) return null;

  return (
    <div className="feedback-box feedback-box--error" role="alert">
      <h3 className="feedback-box__title">{title}</h3>
      <p className="feedback-box__text">{message}</p>
      {onRetry && (
        <div className="feedback-box__actions">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
}

