import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PatrimoinesPage from './pages/PatrimoinesPage';
import PatrimoineDetailPage from './pages/PatrimoineDetailPage';
import CircuitsPage from './pages/CircuitsPage';
import CircuitDetailPage from './pages/CircuitDetailPage';
import EvenementsPage from './pages/EvenementsPage';
import EvenementDetailPage from './pages/EvenementDetailPage';
import ReserverPage from './pages/ReserverPage';
import EmptyState from './components/EmptyState';

/**
 * Fichier unique déclarant toutes les routes de l'application React.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/patrimoines" element={<PatrimoinesPage />} />
        <Route path="/patrimoines/:id" element={<PatrimoineDetailPage />} />
        <Route path="/circuits" element={<CircuitsPage />} />
        <Route path="/circuits/:id" element={<CircuitDetailPage />} />
        <Route path="/evenements" element={<EvenementsPage />} />
        <Route path="/evenements/:id" element={<EvenementDetailPage />} />
        <Route path="/reserver" element={<ReserverPage />} />
        <Route
          path="*"
          element={
            <div className="page-section">
              <div className="container">
                <EmptyState
                  title="Page introuvable (404)"
                  description="La page que vous recherchez n'existe pas ou a été déplacée."
                  actionLabel="Retourner à l'accueil"
                  actionTo="/"
                />
              </div>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}

