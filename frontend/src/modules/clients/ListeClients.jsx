import { AvatarClient } from "../../components/Badges.jsx";
import { Bouton } from "../../components/Bouton.jsx";
import { IconeModifier, IconeVoir } from "../../components/Icons.jsx";

// Tableau des clients. Chaque ligne expose la consultation et la modification de la fiche.
export default function ListeClients({ clients, clientId, decalage = 0, onVoir, onModifier }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Identifiant</th>
            <th>Nom</th>
            <th>Prénom</th>
            <th className="align-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, index) => {
            const selectionne = client.id === clientId;
            return (
              <tr key={client.id} aria-selected={selectionne || undefined}>
                <td data-label="Client">
                  <div className="client-cell">
                    <AvatarClient client={client} index={decalage + index} />
                    <span className="cell-title">
                      {client.nom} {client.prenom}
                    </span>
                  </div>
                </td>
                <td data-label="Identifiant" className="mono muted">
                  n° {client.id}
                </td>
                <td data-label="Nom">{client.nom}</td>
                <td data-label="Prénom">{client.prenom}</td>
                <td data-label="Actions">
                  <div className="row-actions">
                    <Bouton
                      variant="ghost"
                      size="icon"
                      title="Voir le client"
                      aria-label={`Voir ${client.nom} ${client.prenom}`}
                      onClick={() => onVoir(client.id)}
                    >
                      <IconeVoir size={16} />
                    </Bouton>
                    <Bouton
                      variant="ghost"
                      size="icon"
                      title="Modifier le client"
                      aria-label={`Modifier ${client.nom} ${client.prenom}`}
                      onClick={() => onModifier(client.id)}
                    >
                      <IconeModifier size={16} />
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
