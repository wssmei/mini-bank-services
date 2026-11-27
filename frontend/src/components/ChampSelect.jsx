// Liste déroulante avec libellé et message d'erreur, sur le même modèle que Champ.
// options : tableau de { valeur, libelle }. placeholder : première option vide, facultative.
export default function ChampSelect({ id, libelle, valeur, onChange, options, erreur, placeholder, disabled = false }) {
  const idErreur = `${id}-erreur`;
  return (
    <div className="form-field">
      <label htmlFor={id}>{libelle}</label>
      <select
        id={id}
        value={valeur}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? idErreur : undefined}
        className={erreur ? "is-invalid" : ""}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
      {erreur && (
        <p id={idErreur} className="field-error">
          {erreur}
        </p>
      )}
    </div>
  );
}
