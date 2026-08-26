/**
 * App - ครอบทั้งเว็บด้วย Router และ AuthProvider
 */
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
