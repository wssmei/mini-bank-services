// Graphique en anneau (SVG) affichant la répartition des comptes courants et épargne.
export default function AccountDistribution({ comptes = [] }) {
  const total = comptes.length;
  const courants = comptes.filter((c) => c.type_compte === "COURANT").length;
  const epargne = comptes.filter((c) => c.type_compte === "EPARGNE").length;
  const ratioCourants = total > 0 ? courants / total : 0;
  const pctCourants = total > 0 ? Math.round((courants / total) * 100) : 0;
  const pctEpargne = total > 0 ? Math.round((epargne / total) * 100) : 0;

  return (
    <>
      <div className="donut-wrap">
        <svg
          viewBox="0 0 180 180"
          className="donut-svg"
          role="img"
          aria-label={`${courants} comptes courants et ${epargne} comptes épargne`}
        >
          <circle cx="90" cy="90" r="67" className="donut-base" />
          {total > 0 && (
            <circle
              cx="90"
              cy="90"
              r="67"
              className="donut-current"
              strokeDasharray={`${ratioCourants * 421} 421`}
            />
          )}
        </svg>
        <div className="donut-center">
          <strong>{total}</strong>
          <span>{total <= 1 ? "compte au total" : "comptes au total"}</span>
        </div>
      </div>

      <div className="account-legend">
        <div>
          <i className="legend-dot" />
          <span>Comptes courants</span>
          <strong>{courants}</strong>
          <small>{pctCourants} %</small>
        </div>
        <div>
          <i className="legend-dot secondary" />
          <span>Comptes épargne</span>
          <strong>{epargne}</strong>
          <small>{pctEpargne} %</small>
        </div>
      </div>
    </>
  );
}
