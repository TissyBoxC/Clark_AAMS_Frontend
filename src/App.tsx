import ThemeToggle from './components/ThemeToggle.tsx';
import { AppRouter } from './router/index.tsx';
import { AuthProvider } from './store/auth-store';

function App() {
  return (
    <AuthProvider>
      <AppRouter />
      {/* 全站常驻：明暗主题切换。放在 Router 外层，任何页面都能用 */}
      <ThemeToggle />
    </AuthProvider>
  );
}

export default App;
