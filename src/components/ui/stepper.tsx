"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { formatNumber } from "@/domain/format";
import { parseLocalizedNumber } from "@/domain/validation";
import styles from "./stepper.module.css";

/**
 * Número grande con − y + para ajustarlo sin abrir el teclado. También se
 * puede escribir: se guarda al dejar de teclear, sin esperar a salir del campo.
 */
export function Stepper({
  label,
  value,
  unit,
  step,
  min = 0,
  integer = false,
  onChange,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  step: number;
  min?: number;
  integer?: boolean;
  onChange: (value: number | undefined) => void;
}) {
  const id = useId();
  const [text, setText] = useState(formatNumber(value));
  const [isEditing, setIsEditing] = useState(false);
  const pendingCommit = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Si el valor cambia desde fuera (otra serie, deshacer), se muestra el nuevo
  // salvo que se esté escribiendo en el campo.
  const [shownValue, setShownValue] = useState(value);
  if (!isEditing && value !== shownValue) {
    setShownValue(value);
    setText(formatNumber(value));
  }

  useEffect(() => () => clearTimeout(pendingCommit.current), []);

  const commitText = (nextText: string) => {
    clearTimeout(pendingCommit.current);
    const parsed = parseLocalizedNumber(nextText);
    if (parsed === undefined) {
      if (nextText.trim() === "" && value !== undefined) onChange(undefined);
      return;
    }
    const normalized = integer ? Math.round(parsed) : parsed;
    if (normalized >= min && normalized !== value) onChange(normalized);
  };

  const nudge = (direction: -1 | 1) => {
    clearTimeout(pendingCommit.current);
    const base = parseLocalizedNumber(text) ?? value ?? 0;
    const next = Math.max(
      min,
      Math.round((base + direction * step) * 100) / 100,
    );
    setText(formatNumber(next));
    setIsEditing(false);
    if (next !== value) onChange(next);
  };

  return (
    <div className={styles.stepper}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          onClick={() => nudge(-1)}
          aria-label={`Restar ${formatNumber(step)} ${unit} a ${label.toLocaleLowerCase("es-ES")}`}
          disabled={(value ?? 0) <= min}
        >
          <Minus aria-hidden="true" />
        </button>
        <div className={styles.value}>
          <input
            id={id}
            className={styles.input}
            inputMode={integer ? "numeric" : "decimal"}
            enterKeyHint="done"
            autoComplete="off"
            value={text}
            placeholder="—"
            size={Math.max(2, text.length)}
            onFocus={(event) => {
              setIsEditing(true);
              event.target.select();
            }}
            onChange={(event) => {
              const nextText = event.target.value;
              setText(nextText);
              clearTimeout(pendingCommit.current);
              pendingCommit.current = setTimeout(
                () => commitText(nextText),
                600,
              );
            }}
            onBlur={() => {
              commitText(text);
              setIsEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <span className={styles.unit} aria-hidden="true">
            {unit}
          </span>
        </div>
        <button
          type="button"
          className={styles.button}
          onClick={() => nudge(1)}
          aria-label={`Sumar ${formatNumber(step)} ${unit} a ${label.toLocaleLowerCase("es-ES")}`}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
