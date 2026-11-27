import { useCallback, useState } from "react";
import AppLayout from "./components/AppLayout.jsx";
import ClientsPage from "./modules/clients/ClientsPage.jsx";
import ComptesPage from "./modules/comptes/ComptesPage.jsx";
import ConsultationPage from "./modules/consultation/ConsultationPage.jsx";
import DashboardPage from "./modules/dashboard/DashboardPage.jsx";
import OperationsPage from "./modules/operations/OperationsPage.jsx";

export default function App() {
  const [moduleActif, setModuleActif] = useState("dashboard");
  const [navigationContexte, setNavigationContexte] = useState(null);
  const [donneesDashboard, setDonneesDashboard] = useState(null);
  const [donneesVersion, setDonneesVersion] = useState(0);
  const [, setNombreClientsInterne] = useState(null);

  function naviguer(moduleId, contexte = null) {
    setNavigationContexte(contexte);
    setModuleActif(moduleId);
  }

  const signalerModification = useCallback(() => {
    setDonneesVersion((v) => v + 1);
  }, []);

  return (
    <AppLayout
      moduleActif={moduleActif}
      onChangerModule={(id) => naviguer(id, null)}
      actualisation={`${moduleActif}-${donneesVersion}`}
      onClientsCount={setNombreClientsInterne}
    >
      {moduleActif === "dashboard" && (
        <DashboardPage
          donneesInitiales={donneesDashboard}
          onDonneesChargees={setDonneesDashboard}
          versionDonnees={donneesVersion}
          onNaviguer={naviguer}
        />
      )}
      {moduleActif === "clients" && (
        <ClientsPage
          ouvrirCreationInitiale={Boolean(navigationContexte?.ouvrirCreation)}
          onDonneesModifiees={signalerModification}
        />
      )}
      {moduleActif === "comptes" && (
        <ComptesPage
          ouvrirCreationInitiale={Boolean(navigationContexte?.ouvrirCreation)}
          onDonneesModifiees={signalerModification}
          onVoirHistorique={(compteId) => naviguer("consultation", { compteId: String(compteId) })}
        />
      )}
      {moduleActif === "operations" && (
        <OperationsPage
          ongletInitial={navigationContexte?.onglet ?? "depot"}
          onDonneesModifiees={signalerModification}
        />
      )}
      {moduleActif === "consultation" && (
        <ConsultationPage compteInitialId={navigationContexte?.compteId ?? ""} />
      )}
    </AppLayout>
  );
}
