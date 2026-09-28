// Genera los iconos de la PWA: corona de olivo (kótinos) y Η sobre olivo.
// Uso: node scripts/generate-icons.mjs  (los archivos resultantes se versionan)
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const olive = "#56703a";
const leafColor = "#e3e9d8";
const letterColor = "#fafaf8";

/**
 * Ángulo de una hoja: sigue la tangente de su rama (con la punta hacia arriba)
 * y se abre 30° hacia fuera o hacia dentro, alternando.
 */
function leafRotation(angle, side, isOuter) {
  const tangentX = side < 0 ? -Math.sin(angle) : Math.sin(angle);
  const tangentY = side < 0 ? Math.cos(angle) : -Math.cos(angle);
  const along = (Math.atan2(tangentX, -tangentY) * 180) / Math.PI;
  return along + (isOuter ? -30 : 30) * -side;
}

function stems(center, radius, start, end) {
  const point = (angle) => [
    (center + radius * Math.cos(angle)).toFixed(1),
    (center + radius * Math.sin(angle)).toFixed(1),
  ];
  const [lx1, ly1] = point(start);
  const [lx2, ly2] = point(end);
  const [rx1, ry1] = point(Math.PI - start);
  const [rx2, ry2] = point(Math.PI - end);
  return `<path d="M${lx1},${ly1} A${radius},${radius} 0 0 1 ${lx2},${ly2} M${rx1},${ry1} A${radius},${radius} 0 0 0 ${rx2},${ry2}" fill="none" stroke="${leafColor}" stroke-width="${(radius / 44).toFixed(1)}" stroke-linecap="round"/>`;
}

function wreath(center, radius, leafLength) {
  const start = (100 * Math.PI) / 180;
  const end = (250 * Math.PI) / 180;
  const total = 20;
  const perSide = total / 2;
  const half = leafLength / 2;
  const bulge = leafLength * 0.24;
  const leaf = `M0,${-half} C${bulge},${-half / 2} ${bulge},${half / 2} 0,${half} C${-bulge},${half / 2} ${-bulge},${-half / 2} 0,${-half}Z`;
  const leaves = [];
  for (let index = 0; index < total; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const step = Math.floor(index / 2);
    const progress = step / (perSide - 1);
    const angle =
      side < 0
        ? start + progress * (end - start)
        : Math.PI - start - progress * (end - start);
    const offset = (step % 2 === 0 ? 5 : -4) * (radius / 44);
    const x = center + (radius + offset) * Math.cos(angle);
    const y = center + (radius + offset) * Math.sin(angle);
    const rotation = leafRotation(angle, side, offset > 0);
    leaves.push(
      `<path d="${leaf}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation.toFixed(1)})" fill="${leafColor}"/>`,
    );
  }
  return stems(center, radius, start, end) + leaves.join("");
}

/** Η con remates, centrada, de la altura indicada. */
function eta(center, height) {
  const width = height * 0.78;
  const stem = height * 0.15;
  const bar = height * 0.11;
  const serif = height * 0.07;
  const left = center - width / 2;
  const top = center - height / 2;
  const rect = (x, y, w, h) =>
    `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${letterColor}"/>`;
  const serifWidth = stem * 2;
  return [
    rect(left, top, stem, height),
    rect(left + width - stem, top, stem, height),
    rect(left, center - bar / 2, width, bar),
    // Remates arriba y abajo de cada asta.
    rect(left - (serifWidth - stem) / 2, top, serifWidth, serif),
    rect(
      left - (serifWidth - stem) / 2,
      top + height - serif,
      serifWidth,
      serif,
    ),
    rect(left + width - stem - (serifWidth - stem) / 2, top, serifWidth, serif),
    rect(
      left + width - stem - (serifWidth - stem) / 2,
      top + height - serif,
      serifWidth,
      serif,
    ),
  ].join("");
}

function icon({ maskable }) {
  // El icono enmascarable deja el motivo dentro de la zona segura (80 %).
  const scale = maskable ? 0.72 : 0.9;
  const radius = 190 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${maskable ? "" : 'rx="112"'} fill="${olive}"/>
  ${wreath(256, radius, 60 * scale)}
  ${eta(256, 190 * scale)}
</svg>
`;
}

await writeFile("public/icons/icon.svg", icon({ maskable: false }));
await writeFile("public/icons/icon-maskable.svg", icon({ maskable: true }));

const browser = await chromium.launch();
const page = await browser.newPage();
const outputs = [
  { file: "public/icons/icon-192.png", size: 192, maskable: false },
  { file: "public/icons/icon-512.png", size: 512, maskable: false },
  { file: "public/icons/icon-maskable-512.png", size: 512, maskable: true },
  // iOS recorta sus propias esquinas: se le da el cuadrado completo.
  { file: "public/icons/apple-touch-icon.png", size: 180, maskable: true },
];
for (const output of outputs) {
  await page.setViewportSize({ width: output.size, height: output.size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${icon({ maskable: output.maskable })}`,
  );
  await page.screenshot({ path: output.file, omitBackground: true });
}
await browser.close();
console.log(
  `Iconos generados: ${outputs.map((output) => output.file).join(", ")}`,
);
