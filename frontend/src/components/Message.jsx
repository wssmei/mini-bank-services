// Bandeau de retour après une action. Rien n'est affiché si le texte est vide.
// "erreur" est annoncé immédiatement par les lecteurs d'écran (role="alert").
const STYLES = {
  succes: { role: "status", classe: "success" },
  erreur: { role: "alert", classe: "error" },
  info: { role: "status", classe: "info" },
};

export default function Message({ type = "succes", texte }) {
  if (!texte) return null;
  const style = STYLES[type] ?? STYLES.info;
  return (
    <p role={style.role} className={`feedback ${style.classe}`}>
      {texte}
    </p>
  );
}
