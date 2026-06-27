import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider }           from './context/ToastContext';
import { ConfirmDialogProvider }   from './components/ConfirmDialog';
import { LayoutProvider }          from './context/LayoutContext';
import ErrorBoundary               from './components/ErrorBoundary';
import Sidebar   from './components/Sidebar';
import TopBar    from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Products  from './pages/Products';
import Sales     from './pages/Sales';
import Udhaar    from './pages/Udhaar';
import Reports   from './pages/Reports';
import AIAdvisor from './pages/AIAdvisor';
import Expenses  from './pages/Expenses';
import Settings  from './pages/Settings';
import './professional.css';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <ConfirmDialogProvider>
            <LayoutProvider>
              <div className="app-layout">
                <Sidebar />
                <div className="main-content">
                  <TopBar />
                  <Routes>
                    <Route path="/"          element={<Dashboard />} />
                    <Route path="/products"  element={<Products />} />
                    <Route path="/sales"     element={<Sales />} />
                    <Route path="/udhaar"    element={<Udhaar />} />
                    <Route path="/reports"   element={<Reports />} />
                    <Route path="/ai"        element={<AIAdvisor />} />
                    <Route path="/expenses"  element={<Expenses />} />
                    <Route path="/settings"  element={<Settings />} />
                    <Route path="*"          element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </div>
            </LayoutProvider>
          </ConfirmDialogProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
