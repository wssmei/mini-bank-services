import { useEffect, useId, useMemo, useRef, useState } from "react";
import { IconeFermer } from "./Icons.jsx";

function normaliserRecherche(texte) {
  return String(texte ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function IconeChevronBas() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Sélecteur avec recherche intégrée (comptes ou clients) et navigation clavier accessible.
// options : [{ valeur, libelle, recherche?, sousTitre?, droite? }]
export default function ChampSelectRecherche({
  id,
  libelle,
  valeur,
  onChange,
  options,
  placeholder = "Rechercher ou sélectionner…",
  videTexte = "Aucun résultat trouvé.",
  erreur = "",
  disabled = false,
}) {
  const autoId = useId();
  const baseId = id || autoId;
  const listboxId = `${baseId}-listbox`;
  const erreurId = `${baseId}-erreur`;

  const conteneurRef = useRef(null);
  const inputRef = useRef(null);
  const listeRef = useRef(null);

  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [indexActif, setIndexActif] = useState(0);

  const optionSelectionnee = useMemo(
    () => options.find((opt) => opt.valeur === valeur) ?? null,
    [options, valeur],
  );

  const optionsFiltrees = useMemo(() => {
    const termes = normaliserRecherche(saisie).trim().split(/\s+/).filter(Boolean);
    if (termes.length === 0) return options;
    return options.filter((opt) => {
      const cible = normaliserRecherche(
        `${opt.libelle} ${opt.sousTitre ?? ""} ${opt.recherche ?? ""}`,
      );
      return termes.every((t) => cible.includes(t));
    });
  }, [options, saisie]);

  useEffect(() => {
    function surClicExterieur(evenement) {
      if (conteneurRef.current && !conteneurRef.current.contains(evenement.target)) {
        setOuvert(false);
        setSaisie("");
      }
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, []);

  useEffect(() => {
    if (!ouvert || indexActif < 0 || !listeRef.current) return;
    const element = listeRef.current.children[indexActif];
    if (element && typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "nearest" });
    }
  }, [ouvert, indexActif]);

  function ouvrirListe() {
    if (disabled) return;
    setOuvert(true);
    setSaisie("");
    const idx = options.findIndex((opt) => opt.valeur === valeur);
    setIndexActif(idx >= 0 ? idx : 0);
  }

  function selectionnerOption(opt) {
    onChange(opt.valeur);
    setOuvert(false);
    setSaisie("");
  }

  function effacerSelection() {
    onChange("");
    setSaisie("");
    setIndexActif(0);
    inputRef.current?.focus();
  }

  function gererClavier(evenement) {
    if (disabled) return;
    switch (evenement.key) {
      case "ArrowDown": {
        evenement.preventDefault();
        if (!ouvert) {
          ouvrirListe();
        } else if (optionsFiltrees.length > 0) {
          setIndexActif((i) => (i + 1) % optionsFiltrees.length);
        }
        break;
      }
      case "ArrowUp": {
        evenement.preventDefault();
        if (!ouvert) {
          ouvrirListe();
        } else if (optionsFiltrees.length > 0) {
          setIndexActif((i) => (i - 1 + optionsFiltrees.length) % optionsFiltrees.length);
        }
        break;
      }
      case "Home": {
        if (ouvert && optionsFiltrees.length > 0) {
          evenement.preventDefault();
          setIndexActif(0);
        }
        break;
      }
      case "End": {
        if (ouvert && optionsFiltrees.length > 0) {
          evenement.preventDefault();
          setIndexActif(optionsFiltrees.length - 1);
        }
        break;
      }
      case "Enter": {
        if (ouvert) {
          evenement.preventDefault();
          const choix = optionsFiltrees[indexActif];
          if (choix) selectionnerOption(choix);
        }
        break;
      }
      case "Escape": {
        if (ouvert) {
          evenement.preventDefault();
          setOuvert(false);
          setSaisie("");
        }
        break;
      }
      case "Tab": {
        setOuvert(false);
        setSaisie("");
        break;
      }
      default:
        break;
    }
  }

  const valeurAffichee = ouvert ? saisie : optionSelectionnee?.libelle ?? "";
  const placeholderActuel =
    ouvert && optionSelectionnee ? optionSelectionnee.libelle : placeholder;
  const activeOptionId =
    ouvert && optionsFiltrees[indexActif] ? `${baseId}-opt-${indexActif}` : undefined;

  return (
    <div className="form-field" ref={conteneurRef}>
      <label htmlFor={baseId}>{libelle}</label>
      <div className="combobox">
        <div className="combobox-control">
          <input
            ref={inputRef}
            id={baseId}
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            aria-expanded={ouvert}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            aria-invalid={erreur ? true : undefined}
            aria-describedby={erreur ? erreurId : undefined}
            className={`ui-input combobox-input ${erreur ? "is-invalid" : ""}`}
            placeholder={placeholderActuel}
            value={valeurAffichee}
            onFocus={ouvrirListe}
            onClick={() => {
              if (!ouvert) ouvrirListe();
            }}
            onChange={(e) => {
              if (!ouvert) setOuvert(true);
              setSaisie(e.target.value);
              setIndexActif(0);
            }}
            onKeyDown={gererClavier}
          />
          <div className="combobox-actions">
            {valeur && !disabled && (
              <button
                type="button"
                className="combobox-btn"
                onClick={effacerSelection}
                aria-label="Effacer la sélection"
                title="Effacer la sélection"
              >
                <IconeFermer size={13} />
              </button>
            )}
            <button
              type="button"
              className="combobox-btn"
              disabled={disabled}
              tabIndex={-1}
              aria-label={ouvert ? "Fermer la liste" : "Ouvrir la liste"}
              onMouseDown={(e) => {
                e.preventDefault();
                if (ouvert) {
                  setOuvert(false);
                  setSaisie("");
                } else {
                  ouvrirListe();
                  inputRef.current?.focus();
                }
              }}
            >
              <IconeChevronBas />
            </button>
          </div>
        </div>

        {ouvert && (
          <ul
            ref={listeRef}
            id={listboxId}
            role="listbox"
            aria-label={libelle}
            className="combobox-dropdown"
          >
            {optionsFiltrees.length === 0 ? (
              <li className="combobox-empty" role="option" aria-selected={false} aria-disabled="true">
                {videTexte}
              </li>
            ) : (
              optionsFiltrees.map((opt, index) => {
                const estSelectionnee = opt.valeur === valeur;
                const estActive = index === indexActif;
                return (
                  <li
                    key={opt.valeur}
                    id={`${baseId}-opt-${index}`}
                    role="option"
                    aria-selected={estSelectionnee}
                    className={`combobox-option ${estActive ? "is-active" : ""} ${
                      estSelectionnee ? "is-selected" : ""
                    }`}
                    onMouseEnter={() => setIndexActif(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectionnerOption(opt);
                    }}
                  >
                    <div className="combobox-option-main">
                      <span className="combobox-option-title">{opt.libelle}</span>
                      {opt.sousTitre && (
                        <span className="combobox-option-sub">{opt.sousTitre}</span>
                      )}
                    </div>
                    {opt.droite && <span className="combobox-option-right">{opt.droite}</span>}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
      {erreur && (
        <p id={erreurId} className="field-error">
          {erreur}
        </p>
      )}
    </div>
  );
}
