// Un champ de formulaire : libellé, saisie contrôlée et message d'erreur éventuel.
// Les autres attributs (type, maxLength, placeholder…) sont transmis tels quels à l'input.
export default function Champ({ id, libelle, valeur, onChange, erreur, aide, ...attributs }) {
  const idErreur = `${id}-erreur`;
  return (
    <div className="form-field">
      <label htmlFor={id}>{libelle}</label>
      <input
        id={id}
        value={valeur}
        onChange={onChange}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? idErreur : undefined}
        className={`ui-input ${erreur ? "is-invalid" : ""}`}
        {...attributs}
      />
      {aide && !erreur && <span className="field-hint">{aide}</span>}
      {erreur && (
        <p id={idErreur} className="field-error">
          {erreur}
        </p>
      )}
    </div>
  );
}
