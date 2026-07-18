import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Privacy } from './pages/Privacy';
import { WorkflowEditor } from './pages/WorkflowEditor';
import { useUI } from './store/ui';
import { useTheme } from './store/theme';
export function App() {
  const toast = useUI((state) => state.toast);
  const theme = useTheme();
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Dashboard theme={theme.theme} onToggleTheme={theme.toggleTheme} />}
        />
        <Route
          path="/project/:projectId"
          element={<WorkflowEditor theme={theme.theme} onToggleTheme={theme.toggleTheme} />}
        />
        <Route
          path="/privacy"
          element={<Privacy theme={theme.theme} onToggleTheme={theme.toggleTheme} />}
        />
      </Routes>
      {toast && (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.message}
        </div>
      )}
    </BrowserRouter>
  );
}
