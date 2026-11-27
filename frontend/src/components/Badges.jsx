// Badges et avatars utilisés dans les tableaux, fiches et formulaires.
import { libelleTypeCompte, libelleTypeOperation } from "../utils/libelles.js";
import { IconeDepot, IconeOperations, IconeRetrait } from "./Icons.jsx";

export function AvatarClient({ client, index = 0 }) {
  const initiales = client
    ? `${client.prenom?.charAt(0) ?? ""}${client.nom?.charAt(0) ?? ""}`.toUpperCase() || "C"
    : "C";
  return <span className={`client-avatar avatar-tone-${index % 4}`}>{initiales}</span>;
}

export function BadgeTypeCompte({ type }) {
  const estEpargne = type === "EPARGNE";
  return (
    <span className={`type-badge ${estEpargne ? "savings" : "current"}`}>
      <span className="badge-dot" />
      {libelleTypeCompte(type)}
    </span>
  );
}

export function BadgeOperation({ type }) {
  const config =
    type === "DEPOT"
      ? { classe: "deposit", Icone: IconeDepot }
      : type === "RETRAIT"
        ? { classe: "withdrawal", Icone: IconeRetrait }
        : type === "VIREMENT_CREDIT"
          ? { classe: "transfer-in", Icone: IconeDepot }
          : { classe: "transfer", Icone: IconeOperations };

  const { classe, Icone } = config;
  return (
    <span className={`operation-badge ${classe}`}>
      <Icone size={13} />
      {libelleTypeOperation(type)}
    </span>
  );
}
