import { useEffect, useState } from "react";
import { listerClientsEtComptes } from "../../api/comptes.js";
import { Bouton } from "../../components/Bouton.jsx";
import { IconePlus } from "../../components/Icons.jsx";
import Message from "../../components/Message.jsx";
import { ChampRecherche, EtatVide, Modal, PageIntro } from "../../components/UiPrimitives.jsx";
import { nomDuTitulaire } from "../../utils/comptes.js";
import CompteDetail from "./CompteDetail.jsx";
import CompteForm from "./CompteForm.jsx";
import ListeComptes from "./ListeComptes.jsx";

// Module « Gestion des comptes » : répertoire filtrable et fenêtres modales de création et détail.
export default function ComptesPage({
  ouvrirCreationInitiale = false,
  onDonneesModifiees,
  onVoirHistorique,
}) {
  const [donnees, setDonnees] = useState({ clients: [], comptes: [] });
  const [chargement, setChargement] = useState(true);
  const [erreurListe, setErreurListe] = useState("");
  const [rafraichissement, setRafraichissement] = useState(0);
  const [recherche, setRecherche] = useState("");

  const [vue, setVue] = useState(ouvrirCreationInitiale ? "creation" : null);
  const [compteId, setCompteId] = useState(null);
  const [succes, setSucces] = useState("");

  useEffect(() => {
    if (ouvrirCreationInitiale) {
      setSucces("");
      setCompteId(null);
      setVue("creation");
    }
  }, [ouvrirCreationInitiale]);

  useEffect(() => {
    let actif = true;
    listerClientsEtComptes()
      .then((resultat) => {
        if (actif) {
          setDonnees(resultat);
          setErreurListe("");
        }
      })
      .catch((erreur) => {
        if (actif) setErreurListe(erreur.message);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [rafraichissement]);

  function ouvrirCreation() {
    setSucces("");
    setCompteId(null);
    setVue("creation");
  }

  function ouvrirDetail(id) {
    setSucces("");
    setCompteId(id);
    setVue("detail");
  }

  function fermerModale() {
    setVue(null);
  }

  function apresCreation(compte) {
    setSucces(`Compte ${compte.numero} créé.`);
    setCompteId(compte.id);
    setVue("detail");
    setRafraichissement((n) => n + 1);
    onDonneesModifiees?.();
  }

  const { clients, comptes } = donnees;
  const terme = recherche.trim().toLowerCase();
  const estFiltre = terme !== "";
  const comptesFiltres = estFiltre
    ? comptes.filter((compte) => {
        const titulaire = nomDuTitulaire(compte.client_id, clients).toLowerCase();
        return compte.numero.toLowerCase().includes(terme) || titulaire.includes(terme);
      })
    : comptes;

  return (
    <>
      <PageIntro
        titre="Comptes"
        description="Consultez les comptes bancaires, leurs titulaires et leurs soldes en DA."
        action={
          <Bouton onClick={ouvrirCreation}>
            <IconePlus size={16} />
            Nouveau compte
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

      <section className="panel" aria-labelledby="titre-liste-comptes">
        <div className="table-toolbar">
          <h2 id="titre-liste-comptes">
            Liste des comptes
            <span className="count-badge">
              {estFiltre ? `${comptesFiltres.length} / ${comptes.length}` : comptes.length}
            </span>
          </h2>
          <ChampRecherche
            id="recherche-compte"
            valeur={recherche}
            onChange={setRecherche}
            placeholder="Rechercher un compte ou un titulaire…"
          />
        </div>

        {chargement && comptes.length === 0 ? (
          <div className="p-6 muted">Chargement…</div>
        ) : !erreurListe && comptesFiltres.length === 0 ? (
          <EtatVide
            titre={comptes.length === 0 ? "Aucun compte enregistré" : "Aucun compte trouvé"}
            message={
              comptes.length === 0
                ? "Créez d’abord un compte pour un client existant."
                : `Aucun compte ne correspond à « ${recherche.trim()} » sur ${comptes.length} compte(s) au total.`
            }
          />
        ) : !erreurListe ? (
          <ListeComptes
            comptes={comptesFiltres}
            clients={clients}
            compteId={compteId}
            onSelectionner={ouvrirDetail}
          />
        ) : null}

        <div className="table-bottom">
          <span>
            {estFiltre ? (
              <>
                <strong>{comptesFiltres.length}</strong> résultat(s) affiché(s) sur{" "}
                <strong>{comptes.length} compte(s) au total</strong>
              </>
            ) : (
              <>
                Total : <strong>{comptes.length} compte(s)</strong>
              </>
            )}
          </span>
          <span>Soldes en dinars algériens (DA)</span>
        </div>
      </section>

      <Modal
        ouvert={vue === "creation"}
        onFermer={fermerModale}
        titre="Nouveau compte"
        description="Ouvrir un compte courant ou épargne pour un client existant."
      >
        {clients.length === 0 ? (
          <div className="space-y-4">
            <Message
              type="info"
              texte="Aucun client enregistré. Créez d'abord un client dans le module Clients."
            />
            <div className="dialog-actions">
              <Bouton variant="outline" onClick={fermerModale}>
                Fermer
              </Bouton>
            </div>
          </div>
        ) : (
          <CompteForm clients={clients} onCree={apresCreation} onAnnuler={fermerModale} />
        )}
      </Modal>

      <Modal
        ouvert={vue === "detail" && compteId !== null}
        onFermer={fermerModale}
        titre="Détails du compte"
        description="Informations du compte, découvert autorisé et solde disponible."
      >
        {compteId !== null && (
          <CompteDetail
            key={compteId}
            compteId={compteId}
            clients={clients}
            onSoldeActualise={() => {
              setRafraichissement((n) => n + 1);
              onDonneesModifiees?.();
            }}
            onVoirHistorique={
              onVoirHistorique
                ? (id) => {
                    fermerModale();
                    onVoirHistorique(id);
                  }
                : undefined
            }
          />
        )}
      </Modal>
    </>
  );
}
