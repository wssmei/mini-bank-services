// Bouton stylisé réutilisable et bouton avec indicateur de chargement.
import { IconeChargement } from "./Icons.jsx";

const VARIANTES = {
  primary: "btn-primary",
  outline: "btn-outline",
  ghost: "btn-ghost",
};

const TAILLES = {
  default: "",
  sm: "btn-sm",
  icon: "btn-icon",
};

export function Bouton({
  variant = "primary",
  size = "default",
  className = "",
  type = "button",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn ${VARIANTES[variant] ?? VARIANTES.primary} ${TAILLES[size] ?? ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function BoutonChargement({ loading = false, disabled = false, children, ...props }) {
  return (
    <Bouton disabled={loading || disabled} {...props}>
      {loading && <IconeChargement size={15} />}
      {children}
    </Bouton>
  );
}
