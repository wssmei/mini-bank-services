// Composants d'interface partagés : en-tête de page, recherche, état vide, pagination, modale.
import { useEffect, useRef } from "react";
import { Bouton } from "./Bouton.jsx";
import { IconeBoiteVide, IconeChevronDroite, IconeChevronGauche, IconeFermer, IconeRecherche } from "./Icons.jsx";

export function PageIntro({ titre, description, action = null }) {
  return (
    <div className="page-intro">
      <div>
        <h1>{titre}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ChampRecherche({ id = "recherche", valeur, onChange, placeholder, maxLength = 100 }) {
  return (
    <div className="search-field">
      <IconeRecherche size={17} />
      <input
        id={id}
        type="search"
        className="ui-input"
        aria-label={placeholder}
        placeholder={placeholder}
        maxLength={maxLength}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function EtatVide({ titre = "Aucun résultat", message = "Essayez de modifier votre recherche." }) {
  return (
    <div className="empty-state">
      <IconeBoiteVide size={32} />
      <h3>{titre}</h3>
      <p>{message}</p>
    </div>
  );
}

export function Pagination({ page, nombrePages, onChangerPage }) {
  return (
    <div className="pagination">
      <Bouton
        variant="outline"
        size="icon"
        disabled={page <= 1}
        onClick={() => onChangerPage(page - 1)}
        aria-label="Page précédente"
      >
        <IconeChevronGauche size={16} />
      </Bouton>
      <span>
        {page} / {nombrePages}
      </span>
      <Bouton
        variant="outline"
        size="icon"
        disabled={page >= nombrePages}
        onClick={() => onChangerPage(page + 1)}
        aria-label="Page suivante"
      >
        <IconeChevronDroite size={16} />
      </Bouton>
    </div>
  );
}

// Fenêtre modale accessible s'appuyant sur <dialog> natif (touche Échap, focus et fond assombri).
export function Modal({ ouvert, onFermer, titre, description, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (ouvert && !dialog.open) {
      dialog.showModal();
    } else if (!ouvert && dialog.open) {
      dialog.close();
    }
  }, [ouvert]);

  return (
    <dialog
      ref={ref}
      className="modal-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onFermer();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onFermer();
      }}
      aria-labelledby={titre ? "modal-titre" : undefined}
    >
      {ouvert && (
        <>
          <div className="modal-header">
            <div>
              {titre && <h2 id="modal-titre">{titre}</h2>}
              {description && <p>{description}</p>}
            </div>
            <Bouton variant="ghost" size="icon" onClick={onFermer} aria-label="Fermer">
              <IconeFermer size={16} />
            </Bouton>
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}
