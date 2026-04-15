import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SchichttypenPage from '@/pages/SchichttypenPage';
import MitarbeiterPage from '@/pages/MitarbeiterPage';
import SchichtplanPage from '@/pages/SchichtplanPage';
import SchichteinsatzplanungPage from '@/pages/intents/SchichteinsatzplanungPage';
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="schichttypen" element={<SchichttypenPage />} />
              <Route path="mitarbeiter" element={<MitarbeiterPage />} />
              <Route path="schichtplan" element={<SchichtplanPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="intents/schichteinsatzplanung" element={<SchichteinsatzplanungPage />} />
              {/* <custom:routes> */}
              {/* </custom:routes> */}
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
