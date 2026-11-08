import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';

/** Composant racine de l'application */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

