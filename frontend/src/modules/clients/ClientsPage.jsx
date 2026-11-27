import { useEffect, useState } from "react";
import { listerClients } from "../../api/clients.js";
import { Bouton } from "../../components/Bouton.jsx";
import { IconePlus } from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { ChampRecherche, EtatVide, Modal, PageIntro, Pagination } from "../../components/UiPrimitives.jsx";
import ClientDetail from "./ClientDetail.jsx";
import ClientForm from "./ClientForm.jsx";
import ListeClients from "./ListeClients.jsx";

const DELAI_RECHERCHE_MS = 250;
const TAILLE_PAGE = 8;

function filtrerClientsComplets(liste, recherche) {
  const termes = recherche
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (termes.length === 0) return liste;
  return liste.filter((c) => {
    const identite = `${c.nom} ${c.prenom}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return termes.every((t) => identite.includes(t));
  });
}

// Module « Gestion des clients » : recherche serveur (y compris requêtes courtes) et distinction total / filtrés.
export default function ClientsPage({ ouvrirCreationInitiale = false, onDonneesModifiees }) {
  const [recherche, setRecherche] = useState("");
  const [clients, setClients] = useState([]);
  const [totalClients, setTotalClients] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreurListe, setErreurListe] = useState("");
  const [rafraichissement, setRafraichissement] = useState(0);
  const [page, setPage] = useState(1);

  const [vue, setVue] = useState(ouvrirCreationInitiale ? "creation" : null);
  const [clientId, setClientId] = useState(null);
  const [editionDirecte, setEditionDirecte] = useState(false);
  const [succes, setSucces] = useState("");

  useEffect(() => {
    if (ouvrirCreationInitiale) {
      setSucces("");
      setClientId(null);
      setVue("creation");
    }
  }, [ouvrirCreationInitiale]);

  useEffect(() => {
    let actif = true;
    const terme = recherche.trim();
    const multiMots = /\s/.test(terme);
    const delai = terme === "" ? 0 : DELAI_RECHERCHE_MS;

    const minuterie = setTimeout(() => {
      setChargement(true);
      const requetes = multiMots
        ? Promise.all([listerClients(""), listerClients("")])
        : terme === ""
          ? Promise.all([listerClients(""), null])
          : Promise.all([listerClients(terme), listerClients("")]);

      requetes
        .then(([liste, tous]) => {
          if (!actif) return;
          const resultats = multiMots ? filtrerClientsComplets(liste, terme) : liste;
          setClients(resultats);
          setTotalClients((tous ?? liste).length);
          setErreurListe("");
          setPage(1);
        })
        .catch((erreur) => {
          if (actif) setErreurListe(erreur.message);
        })
        .finally(() => {
          if (actif) setChargement(false);
        });
    }, delai);

    return () => {
      actif = false;
      clearTimeout(minuterie);
    };
  }, [recherche, rafraichissement]);

  function ouvrirCreation() {
    setSucces("");
    setClientId(null);
    setEditionDirecte(false);
    setVue("creation");
  }

  function ouvrirFiche(id, enEdition = false) {
    setSucces("");
    setClientId(id);
    setEditionDirecte(enEdition);
    setVue("detail");
  }

  function fermerModale() {
    setVue(null);
    setEditionDirecte(false);
  }

  function apresCreation(client) {
    setSucces(`Client « ${client.nom} ${client.prenom} » créé.`);
    setClientId(client.id);
    setEditionDirecte(false);
    setVue("detail");
    setTotalClients((n) => n + 1);
    setRafraichissement((n) => n + 1);
    onDonneesModifiees?.();
  }

  function apresModification() {
    setRafraichissement((n) => n + 1);
    onDonneesModifiees?.();
  }

  const termeRecherche = recherche.trim();
  const estFiltre = termeRecherche !== "";
  const nombrePages = Math.max(1, Math.ceil(clients.length / TAILLE_PAGE));
  const pageCourante = Math.min(page, nombrePages);
  const clientsVisibles = clients.slice(
    (pageCourante - 1) * TAILLE_PAGE,
    pageCourante * TAILLE_PAGE,
  );

  return (
    <>
      <PageIntro
        titre="Clients"
        description="Gérez les clients enregistrés et consultez leurs comptes associés."
        action={
          <Bouton onClick={ouvrirCreation}>
            <IconePlus size={16} />
            Nouveau client
          </Bouton>
        }
      />

      {succes && (
        <div className="mb-5">
          <Message type="succes" texte={succes} />
        </div>
      )}

      {erreurListe && (
        <div className="mb-5">
          <Message type="erreur" texte={erreurListe} />
        </div>
      )}

      <section className="panel" aria-labelledby="titre-liste-clients">
        <div className="table-toolbar">
          <h2 id="titre-liste-clients">
            Liste des clients
            <span className="count-badge">
              {estFiltre ? `${clients.length} / ${totalClients}` : totalClients}
            </span>
          </h2>
          <ChampRecherche
            id="recherche-client"
            valeur={recherche}
            onChange={(val) => {
              setRecherche(val);
              setPage(1);
            }}
            placeholder="Rechercher par nom ou prénom…"
          />
        </div>

        {chargement && clients.length === 0 && totalClients === 0 ? (
          <div className="p-6 muted">Chargement…</div>
        ) : !erreurListe && clients.length === 0 ? (
          <EtatVide
            titre="Aucun client trouvé"
            message={
              estFiltre
                ? `Aucun client ne correspond à « ${termeRecherche} » sur ${totalClients} client(s) au total.`
                : "Aucun client enregistré pour le moment."
            }
          />
        ) : !erreurListe ? (
          <ListeClients
            clients={clientsVisibles}
            clientId={clientId}
            decalage={(pageCourante - 1) * TAILLE_PAGE}
            onVoir={(id) => ouvrirFiche(id, false)}
            onModifier={(id) => ouvrirFiche(id, true)}
          />
        ) : null}

        <div className="table-bottom">
          <span>
            {estFiltre ? (
              <>
                <strong>{clients.length}</strong> résultat(s) pour « {termeRecherche} » sur{" "}
                <strong>{totalClients} client(s) au total</strong>
              </>
            ) : (
              <>
                {clients.length
                  ? `${(pageCourante - 1) * TAILLE_PAGE + 1}–${Math.min(pageCourante * TAILLE_PAGE, clients.length)}`
                  : "0"}{" "}
                sur <strong>{totalClients} client(s) au total</strong>
              </>
            )}
          </span>
          <Pagination
            page={pageCourante}
            nombrePages={nombrePages}
            onChangerPage={setPage}
          />
        </div>
      </section>

      <Modal
        ouvert={vue === "creation"}
        onFermer={fermerModale}
        titre="Nouveau client"
        description="Renseignez l’identité du nouveau client."
      >
        <ClientForm onCree={apresCreation} onAnnuler={fermerModale} />
      </Modal>

      <Modal
        ouvert={vue === "detail" && clientId !== null}
        onFermer={fermerModale}
        titre="Fiche client"
        description="Identité, modification et comptes rattachés."
      >
        {clientId !== null && (
          <ClientDetail
            key={`${clientId}-${editionDirecte ? "edit" : "view"}`}
            clientId={clientId}
            editionInitiale={editionDirecte}
            onModifie={apresModification}
          />
        )}
      </Modal>
    </>
  );
}
