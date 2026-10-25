import { AppRouter } from './router/index.tsx';
import { AuthProvider } from './store/auth-store';

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
