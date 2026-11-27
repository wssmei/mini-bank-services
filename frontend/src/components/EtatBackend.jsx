import { useEffect, useState } from "react";
import { listerClients } from "../api/clients.js";
import { Bouton } from "./Bouton.jsx";
import { IconeActualiser } from "./Icons.jsx";

// Vérification interne de la connectivité backend et synchronisation du nombre de clients.
// Reste silencieuse lorsque le service répond, et affiche un message clair uniquement en cas d'échec.
export default function EtatBackend({ actualisation, onClientsCount }) {
  const [etat, setEtat] = useState({ statut: "chargement" });
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    let actif = true;
    listerClients()
      .then((clients) => {
        if (!actif) return;
        setEtat({ statut: "ok", nombre: clients.length });
        onClientsCount?.(clients.length);
      })
      .catch((erreur) => {
        if (actif) setEtat({ statut: "erreur", message: erreur.message });
      });
    return () => {
      actif = false;
    };
  }, [essai, actualisation, onClientsCount]);

  function reessayer() {
    setEtat({ statut: "chargement" });
    setEssai((n) => n + 1);
  }

  if (etat.statut !== "erreur") return null;

  return (
    <div className="backend-alert" role="alert">
      <span>
        Le service bancaire est momentanément inaccessible. Vérifiez que le serveur est démarré puis réessayez.
      </span>
      <Bouton variant="outline" size="sm" onClick={reessayer}>
        <IconeActualiser size={13} />
        Réessayer
      </Bouton>
    </div>
  );
}
