// Carte de statistique : un libellé, une valeur principale, une icône optionnelle et une précision.
export default function CarteChiffre({ libelle, valeur, precision, icone = null, ton = "mint", estMonnaie = false }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{libelle}</span>
        {icone && <span className={`metric-icon ${ton}`}>{icone}</span>}
      </div>
      <div className={`metric-value ${estMonnaie ? "currency" : ""}`}>{valeur}</div>
      {precision && <div className="metric-caption">{precision}</div>}
    </article>
  );
}
