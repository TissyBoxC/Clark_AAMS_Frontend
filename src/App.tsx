import { BrowserRouter } from 'react-router-dom';

import AppRoutes from './router';
import { ToastProvider } from './components/ToastHost';
import { AuthProvider } from './store/auth';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
