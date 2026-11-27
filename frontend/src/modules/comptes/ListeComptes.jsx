import { AvatarClient, BadgeTypeCompte } from "../../components/Badges.jsx";
import { Bouton } from "../../components/Bouton.jsx";
import { IconeVoir } from "../../components/Icons.jsx";
import { nomDuTitulaire } from "../../utils/comptes.js";
import { formaterMontant } from "../../utils/montants.js";

// Tableau des comptes. Chaque ligne ouvre la fenêtre de détail du compte.
export default function ListeComptes({ comptes, clients, compteId, onSelectionner }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Numéro de compte</th>
            <th>Titulaire</th>
            <th>Type</th>
            <th className="align-right">Solde actuel</th>
            <th className="align-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {comptes.map((compte, index) => {
            const titulaire = clients.find((c) => c.id === compte.client_id);
            const selectionne = compte.id === compteId;
            return (
              <tr key={compte.id} aria-selected={selectionne || undefined}>
                <td data-label="Numéro de compte">
                  <span className="mono font-medium">{compte.numero}</span>
                </td>
                <td data-label="Titulaire">
                  <div className="client-cell">
                    <AvatarClient client={titulaire} index={index} />
                    <div>
                      <span className="cell-title">{nomDuTitulaire(compte.client_id, clients)}</span>
                      <span className="cell-sub mono">Client n° {compte.client_id}</span>
                    </div>
                  </div>
                </td>
                <td data-label="Type">
                  <BadgeTypeCompte type={compte.type_compte} />
                </td>
                <td data-label="Solde actuel" className="align-right amount">
                  {formaterMontant(compte.solde)} DA
                </td>
                <td data-label="Actions" className="align-right">
                  <div className="row-actions">
                    <Bouton
                      variant="ghost"
                      size="icon"
                      title="Voir le compte"
                      aria-label={`Voir ${compte.numero}`}
                      onClick={() => onSelectionner(compte.id)}
                    >
                      <IconeVoir size={16} />
                    </Bouton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
