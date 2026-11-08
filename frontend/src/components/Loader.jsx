import './Feedback.css';

/** Indicateur de chargement doux */
export default function Loader({ message = 'Chargement des données en cours...' }) {
  return (
    <div className="feedback-box feedback-box--loader" role="status" aria-live="polite">
      <div className="loader-spinner" aria-hidden="true" />
      <p className="feedback-box__text">{message}</p>
    </div>
  );
}

