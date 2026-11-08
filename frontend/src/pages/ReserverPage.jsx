import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  getAllReservations,
  createReservation,
  cancelReservation,
} from '../api/reservations';
import { getAllCircuits } from '../api/circuits';
import { getAllEvenements } from '../api/evenements';
import { formatDateHeure, formatPrixFCFA } from '../utils/formatters';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import './ReserverPage.css';

/**
 * Page Réserver :
 * - Formulaire pour réserver un CIRCUIT ou un EVENEMENT (POST /api/reservations)
 * - Affichage clair du message d'erreur renvoyé par le back-end (ex. capacité insuffisante)
 * - Liste des réservations enregistrées (GET /api/reservations)
 * - Bouton d'annulation (PUT /api/reservations/{id}/annuler)
 */
export default function ReserverPage() {
  const [searchParams] = useSearchParams();
  const initialType =
    searchParams.get('type') === 'EVENEMENT' ? 'EVENEMENT' : 'CIRCUIT';
  const initialCircuitId = searchParams.get('circuitId') || '';
  const initialEvenementId = searchParams.get('evenementId') || '';

  const [circuits, setCircuits] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [listError, setListError] = useState(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    nomClient: '',
    emailClient: '',
    telephoneClient: '',
    nombrePlaces: 1,
    typeReservation: initialType,
    circuitId: initialCircuitId,
    evenementId: initialEvenementId,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);

  const chargerTout = useCallback(async () => {
    setLoadingInitial(true);
    setListError(null);
    try {
      const [resData, cirData, evtData] = await Promise.all([
        getAllReservations(),
        getAllCircuits().catch(() => []),
        getAllEvenements().catch(() => []),
      ]);

      const cirList = Array.isArray(cirData) ? cirData : [];
      const evtList = Array.isArray(evtData) ? evtData : [];

      setReservations(Array.isArray(resData) ? resData : []);
      setCircuits(cirList);
      setEvenements(evtList);

      // Pré-sélectionner le premier circuit ou événement disponible si aucun n'est choisi
      setFormData((prev) => ({
        ...prev,
        circuitId: prev.circuitId || (cirList[0] ? String(cirList[0].id) : ''),
        evenementId: prev.evenementId || (evtList[0] ? String(evtList[0].id) : ''),
      }));
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    chargerTout();
  }, [chargerTout]);

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const isCircuit = formData.typeReservation === 'CIRCUIT';
    const payload = {
      nomClient: formData.nomClient.trim(),
      emailClient: formData.emailClient.trim(),
      telephoneClient: formData.telephoneClient.trim(),
      nombrePlaces: Number(formData.nombrePlaces),
      typeReservation: formData.typeReservation,
      circuitId: isCircuit && formData.circuitId ? Number(formData.circuitId) : null,
      evenementId:
        !isCircuit && formData.evenementId ? Number(formData.evenementId) : null,
    };

    try {
      const created = await createReservation(payload);
      setSubmitSuccess(
        `Réservation #${created.id} confirmée pour ${created.nomClient} (${created.nombrePlaces} place(s), montant : ${formatPrixFCFA(created.montantTotal)}).`
      );
      setFormData((prev) => ({
        ...prev,
        nomClient: '',
        emailClient: '',
        telephoneClient: '',
        nombrePlaces: 1,
      }));
      // Rafraîchir la liste des réservations
      const updatedList = await getAllReservations();
      setReservations(Array.isArray(updatedList) ? updatedList : []);
    } catch (err) {
      // Affiche exactement le message {"erreur": "..."} renvoyé par le back-end
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnnuler(id) {
    setCancelingId(id);
    setSubmitError(null);
    try {
      await cancelReservation(id);
      const updatedList = await getAllReservations();
      setReservations(Array.isArray(updatedList) ? updatedList : []);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setCancelingId(null);
    }
  }

  // Dictionnaires pour afficher les noms des circuits/événements dans la liste des réservations
  const circuitsById = Object.fromEntries(circuits.map((c) => [c.id, c]));
  const evenementsById = Object.fromEntries(evenements.map((ev) => [ev.id, ev]));

  const circuitOptions = [
    { value: '', label: '-- Sélectionner un circuit --' },
    ...circuits.map((c) => ({
      value: String(c.id),
      label: `${c.nomCircuit} (${formatPrixFCFA(c.prix)} — max ${c.placesMax} places)`,
    })),
  ];

  const evenementOptions = [
    { value: '', label: '-- Sélectionner un événement --' },
    ...evenements.map((ev) => ({
      value: String(ev.id),
      label: `${ev.nomEvenement} (${formatPrixFCFA(ev.prix)} — max ${ev.capaciteMax} places)`,
    })),
  ];

  return (
    <div className="page-section">
      <div className="container">
        <header className="page-header">
          <h1 className="page-header__title">Réserver une Visite ou un Événement</h1>
          <p className="page-header__subtitle">
            Réservez vos places pour un circuit touristique ou un événement culturel et
            gérez vos réservations en temps réel.
          </p>
        </header>

        <div className="reserver-layout">
          {/* Colonne gauche : Formulaire de création */}
          <section className="reserver-form-card">
            <h2 className="reserver-card-title">Nouvelle réservation</h2>

            {submitError && (
              <ErrorMessage
                title="Réservation refusée"
                message={submitError}
              />
            )}

            {submitSuccess && (
              <div className="reserver-success" role="status">
                <strong>Confirmation :</strong> {submitSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <FormField
                id="typeReservation"
                label="Que souhaitez-vous réserver ?"
                type="select"
                required
                value={formData.typeReservation}
                onChange={(e) => handleChange('typeReservation', e.target.value)}
                options={[
                  { value: 'CIRCUIT', label: 'Un circuit touristique' },
                  { value: 'EVENEMENT', label: 'Un événement culturel' },
                ]}
              />

              {formData.typeReservation === 'CIRCUIT' ? (
                <FormField
                  id="circuitId"
                  label="Circuit choisi"
                  type="select"
                  required
                  value={formData.circuitId}
                  onChange={(e) => handleChange('circuitId', e.target.value)}
                  options={circuitOptions}
                  helpText={
                    circuits.length === 0
                      ? 'Aucun circuit enregistré dans ms-circuit.'
                      : undefined
                  }
                />
              ) : (
                <FormField
                  id="evenementId"
                  label="Événement choisi"
                  type="select"
                  required
                  value={formData.evenementId}
                  onChange={(e) => handleChange('evenementId', e.target.value)}
                  options={evenementOptions}
                  helpText={
                    evenements.length === 0
                      ? 'Aucun événement enregistré dans ms-evenement.'
                      : undefined
                  }
                />
              )}

              <FormField
                id="nomClient"
                label="Nom complet du visiteur"
                type="text"
                required
                placeholder="Ex: Aminata Diallo"
                value={formData.nomClient}
                onChange={(e) => handleChange('nomClient', e.target.value)}
              />

              <FormField
                id="emailClient"
                label="Adresse e-mail"
                type="email"
                required
                placeholder="Ex: aminata.diallo@uasz.sn"
                value={formData.emailClient}
                onChange={(e) => handleChange('emailClient', e.target.value)}
              />

              <FormField
                id="telephoneClient"
                label="Téléphone"
                type="tel"
                placeholder="Ex: +221 77 000 00 00"
                value={formData.telephoneClient}
                onChange={(e) => handleChange('telephoneClient', e.target.value)}
              />

              <FormField
                id="nombrePlaces"
                label="Nombre de places souhaitées"
                type="number"
                required
                min={1}
                value={formData.nombrePlaces}
                onChange={(e) => handleChange('nombrePlaces', e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting}
                className="reserver-submit-btn"
              >
                {submitting ? 'Enregistrement en cours...' : 'Confirmer la réservation'}
              </Button>
            </form>
          </section>

          {/* Colonne droite : Liste des réservations */}
          <section className="reserver-list-section">
            <div className="reserver-list-header">
              <h2 className="reserver-card-title">
                Réservations enregistrées ({reservations.length})
              </h2>
              <Button variant="secondary" size="sm" onClick={chargerTout}>
                Actualiser
              </Button>
            </div>

            {loadingInitial && <Loader message="Chargement des réservations..." />}

            {!loadingInitial && listError && (
              <ErrorMessage
                title="Erreur de chargement des réservations"
                message={listError}
                onRetry={chargerTout}
              />
            )}

            {!loadingInitial && !listError && reservations.length === 0 && (
              <EmptyState
                title="Aucune réservation enregistrée"
                description="Utilisez le formulaire ci-contre pour effectuer votre première réservation."
              />
            )}

            {!loadingInitial && !listError && reservations.length > 0 && (
              <div className="reservations-list">
                {reservations.map((res) => {
                  const isAnnulee = res.statut === 'ANNULEE';
                  const circuitLie =
                    res.circuit || (res.circuitId ? circuitsById[res.circuitId] : null);
                  const evtLie =
                    res.evenement ||
                    (res.evenementId ? evenementsById[res.evenementId] : null);

                  return (
                    <article
                      key={res.id}
                      className={`reservation-item ${
                        isAnnulee ? 'reservation-item--annulee' : ''
                      }`}
                    >
                      <div className="reservation-item__top">
                        <div className="reservation-item__badges">
                          <span className="badge">Réservation #{res.id}</span>
                          <span
                            className={`badge ${
                              res.typeReservation === 'CIRCUIT' ? 'badge--warm' : ''
                            }`}
                          >
                            {res.typeReservation === 'CIRCUIT' ? 'Circuit' : 'Événement'}
                          </span>
                          <span
                            className={`badge ${
                              isAnnulee ? 'badge--memorial' : ''
                            }`}
                          >
                            Statut : {res.statut}
                          </span>
                        </div>
                        <span className="reservation-item__date">
                          {formatDateHeure(res.dateReservation)}
                        </span>
                      </div>

                      <h3 className="reservation-item__title">
                        {res.typeReservation === 'CIRCUIT' ? (
                          circuitLie ? (
                            <Link to={`/circuits/${res.circuitId}`}>
                              {circuitLie.nomCircuit}
                            </Link>
                          ) : (
                            `Circuit #${res.circuitId}`
                          )
                        ) : evtLie ? (
                          <Link to={`/evenements/${res.evenementId}`}>
                            {evtLie.nomEvenement}
                          </Link>
                        ) : (
                          `Événement #${res.evenementId}`
                        )}
                      </h3>

                      <div className="reservation-item__details">
                        <span>
                          <strong>Visiteur :</strong> {res.nomClient} ({res.emailClient})
                        </span>
                        {res.telephoneClient && (
                          <span>
                            <strong>Tél :</strong> {res.telephoneClient}
                          </span>
                        )}
                        <span>
                          <strong>Places :</strong> {res.nombrePlaces}
                        </span>
                        <span>
                          <strong>Montant total :</strong>{' '}
                          {formatPrixFCFA(res.montantTotal)}
                        </span>
                      </div>

                      {!isAnnulee && (
                        <div className="reservation-item__actions">
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={cancelingId === res.id}
                            onClick={() => handleAnnuler(res.id)}
                          >
                            {cancelingId === res.id
                              ? 'Annulation...'
                              : 'Annuler la réservation'}
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

