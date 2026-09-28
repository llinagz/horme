import styles from "./kotinos.module.css";

const size = 120;
const center = 60;
const radius = 44;
const branchStart = (100 * Math.PI) / 180;
const branchEnd = (250 * Math.PI) / 180;
const leafPath = "M0,-9 C4.4,-4.3 4.4,4.3 0,9 C-4.4,4.3 -4.4,-4.3 0,-9Z";

function pointAt(angle: number, distance = radius): [number, number] {
  return [
    center + distance * Math.cos(angle),
    center + distance * Math.sin(angle),
  ];
}

/**
 * Ángulo de una hoja: sigue la tangente de su rama (con la punta hacia arriba)
 * y se abre 30° hacia fuera o hacia dentro, alternando.
 */
function leafRotation(angle: number, side: number, isOuter: boolean): number {
  const tangentX = side < 0 ? -Math.sin(angle) : Math.sin(angle);
  const tangentY = side < 0 ? Math.cos(angle) : -Math.cos(angle);
  const along = (Math.atan2(tangentX, -tangentY) * 180) / Math.PI;
  return along + (isOuter ? -30 : 30) * -side;
}

interface Leaf {
  transform: string;
}

/**
 * Posiciones de las hojas: dos ramas que suben desde abajo, alternando
 * izquierda y derecha, y se cierran arriba cuando están todas.
 */
function layoutLeaves(total: number): Leaf[] {
  const perSide = Math.max(1, Math.ceil(total / 2));
  return Array.from({ length: total }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const step = Math.floor(index / 2);
    const progress = perSide === 1 ? 0.5 : step / (perSide - 1);
    const angle =
      side < 0
        ? branchStart + progress * (branchEnd - branchStart)
        : Math.PI - branchStart - progress * (branchEnd - branchStart);
    const offset = step % 2 === 0 ? 5 : -4;
    const [x, y] = pointAt(angle, radius + offset);
    return {
      transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${leafRotation(angle, side, offset > 0).toFixed(1)})`,
    };
  });
}

const [leftStartX, leftStartY] = pointAt(branchStart);
const [leftEndX, leftEndY] = pointAt(branchEnd);
const [rightStartX, rightStartY] = pointAt(Math.PI - branchStart);
const [rightEndX, rightEndY] = pointAt(Math.PI - branchEnd);
const stems = [
  `M${leftStartX},${leftStartY} A${radius},${radius} 0 0 1 ${leftEndX},${leftEndY}`,
  `M${rightStartX},${rightStartY} A${radius},${radius} 0 0 0 ${rightEndX},${rightEndY}`,
];

/**
 * Kótinos, la corona de olivo de los vencedores olímpicos: gana una hoja por
 * cada serie completada y se cierra al completar la sesión.
 */
export function Kotinos({
  total,
  done,
  size: displaySize = "large",
  tone = "default",
}: {
  total: number;
  done: number;
  size?: "large" | "small";
  tone?: "default" | "inverse";
}) {
  // La corona siempre tiene las mismas hojas y se llena en proporción, para
  // que con tres series parezca una corona y con treinta quepa.
  const leafCount = 20;
  const doneLeaves =
    total === 0 ? 0 : Math.round((Math.min(done, total) / total) * leafCount);
  const leaves = layoutLeaves(leafCount);
  const label =
    total === 0
      ? "Todavía no hay series"
      : `${done} de ${total} series completadas`;
  return (
    <div
      className={[
        styles.kotinos,
        displaySize === "small" ? styles.small : "",
        tone === "inverse" ? styles.inverse : "",
      ].join(" ")}
      role="img"
      aria-label={label}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {stems.map((stem) => (
          <path key={stem} className={styles.stem} d={stem} />
        ))}
        {leaves.map((leaf, index) => (
          <g key={index} transform={leaf.transform}>
            <path
              className={index < doneLeaves ? styles.leafOn : styles.leafOff}
              d={leafPath}
            />
          </g>
        ))}
      </svg>
      <div className={styles.count} aria-hidden="true">
        <b>{done}</b>
        <span>de {total}</span>
      </div>
    </div>
  );
}
