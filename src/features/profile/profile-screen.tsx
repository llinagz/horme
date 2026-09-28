"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getCurrentBodyValues } from "@/domain/calculations";
import { getTodayLocalDate } from "@/domain/dates";
import type { BodyMeasurement } from "@/domain/entities";
import { getErrorMessage } from "@/domain/errors";
import { formatNumber, formatShortDate } from "@/domain/format";
import { parseLocalizedNumber } from "@/domain/validation";
import { athleteProfileRepository } from "@/infrastructure/repositories/athlete-profile-repository";
import { bodyMeasurementRepository } from "@/infrastructure/repositories/body-measurement-repository";
import { getInitial } from "@/components/app-shell";
import {
  useAthleteProfile,
  useBodyMeasurements,
} from "@/components/data-hooks";
import { LazyProgressChart } from "@/components/lazy-progress-chart";
import { useConfirm } from "@/components/ui/sheet";
import {
  Figure,
  InlineMessage,
  LoadingState,
  PageHeader,
} from "@/components/ui/states";
import { useAction, useToast } from "@/components/ui/toast";
import styles from "./profile.module.css";

function describeMeasurement(measurement: BodyMeasurement): string {
  return [
    measurement.weightKilograms !== undefined
      ? `${formatNumber(measurement.weightKilograms)} kg`
      : null,
    measurement.heightCentimeters !== undefined
      ? `${formatNumber(measurement.heightCentimeters)} cm`
      : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function ProfileScreen() {
  const profile = useAthleteProfile();
  const measurements = useBodyMeasurements();
  const run = useAction();
  const { show } = useToast();
  const confirm = useConfirm();
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [measurementDate, setMeasurementDate] = useState(getTodayLocalDate());
  const [weight, setWeight] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  if (!profile || measurements === undefined)
    return <LoadingState label="Cargando tu perfil…" />;

  const current = getCurrentBodyValues(measurements);
  const weightData = measurements.flatMap((measurement) =>
    measurement.weightKilograms === undefined
      ? []
      : [
          {
            date: measurement.measurementDate,
            weight: measurement.weightKilograms,
          },
        ],
  );

  const resetForm = () => {
    setEditingId(null);
    setMeasurementDate(getTodayLocalDate());
    setWeight("");
    setFormError("");
  };

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await run(
      async () => {
        await athleteProfileRepository.updateDisplayName(displayName);
        return true;
      },
      { success: "Nombre guardado" },
    );
    if (saved) setIsEditingName(false);
  };

  const saveMeasurement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedWeight = parseLocalizedNumber(weight);
    const input = {
      measurementDate,
      ...(parsedWeight !== undefined ? { weightKilograms: parsedWeight } : {}),
    };
    try {
      if (editingId) await bodyMeasurementRepository.update(editingId, input);
      else await bodyMeasurementRepository.create(input);
      show({ message: editingId ? "Medición corregida" : "Medición añadida" });
      resetForm();
    } catch (error) {
      // El error se muestra junto al formulario para poder corregirlo ahí.
      setFormError(getErrorMessage(error));
    }
  };

  const editMeasurement = (measurement: BodyMeasurement) => {
    setEditingId(measurement.bodyMeasurementId);
    setMeasurementDate(measurement.measurementDate);
    setWeight(formatNumber(measurement.weightKilograms));
    setFormError("");
    document
      .getElementById("measurement-form")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const removeMeasurement = async (measurement: BodyMeasurement) => {
    const accepted = await confirm({
      title: `¿Eliminar la medición del ${formatShortDate(measurement.measurementDate)}?`,
      description: describeMeasurement(measurement),
      confirmLabel: "Eliminar medición",
      tone: "danger",
    });
    if (accepted)
      await run(
        () => bodyMeasurementRepository.remove(measurement.bodyMeasurementId),
        { success: "Medición eliminada" },
      );
  };

  return (
    <div className="stack-large">
      <PageHeader title="Perfil" />

      <section className={styles.identity}>
        <span className={styles.avatar} aria-hidden="true">
          {getInitial(profile.displayName)}
        </span>
        {isEditingName ? (
          <form className={styles.nameForm} onSubmit={saveName}>
            <label className="field">
              <span>Nombre</span>
              <input
                value={displayName}
                maxLength={50}
                autoComplete="name"
                autoFocus
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <div className={styles.nameActions}>
              <button type="submit" className="button primary">
                Guardar nombre
              </button>
              <button
                type="button"
                className="button quiet"
                onClick={() => setIsEditingName(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.name}>
            <h2 className="title-md">{profile.displayName}</h2>
            <button
              type="button"
              className="link"
              onClick={() => {
                setDisplayName(profile.displayName);
                setIsEditingName(true);
              }}
            >
              Cambiar nombre
            </button>
          </div>
        )}
      </section>

      <div className="stats">
        <div className="stat">
          <span>Peso</span>
          <Figure
            value={formatNumber(current.weightKilograms) || "—"}
            unit="kg"
          />
        </div>
        <div className="stat">
          <span>Altura</span>
          <Figure
            value={formatNumber(current.heightCentimeters) || "—"}
            unit="cm"
          />
        </div>
      </div>

      <section className="section">
        <h2 className="heading">Evolución del peso</h2>
        <LazyProgressChart
          title="Evolución del peso"
          data={weightData}
          series={[
            { dataKey: "weight", label: "Peso", tone: "olive", unit: "kg" },
          ]}
          emptyLabel="Añade otra medición para ver la evolución."
        />
      </section>

      <section className="sheet-card" id="measurement-form">
        <h2 className="heading">
          {editingId ? "Corregir medición" : "Añadir medición"}
        </h2>
        <form className="stack" onSubmit={saveMeasurement} noValidate>
          <div className="field-row">
            <label className="field">
              <span>Fecha</span>
              <input
                type="date"
                required
                value={measurementDate}
                onChange={(event) => setMeasurementDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Peso</span>
              <span className="with-unit">
                <input
                  inputMode="decimal"
                  value={weight}
                  placeholder="78,4"
                  onChange={(event) => setWeight(event.target.value)}
                />
                <span>kg</span>
              </span>
            </label>
          </div>
          {formError ? (
            <InlineMessage tone="error">{formError}</InlineMessage>
          ) : null}
          <div className={styles.formActions}>
            <button type="submit" className="button primary">
              {editingId ? "Guardar corrección" : "Añadir medición"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="button quiet"
                onClick={resetForm}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="section">
        <h2 className="heading">Mediciones</h2>
        <div className="list">
          {measurements.toReversed().map((measurement) => (
            <div key={measurement.bodyMeasurementId} className="list-row">
              <div>
                <strong>{describeMeasurement(measurement)}</strong>
                <p>{formatShortDate(measurement.measurementDate)}</p>
              </div>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Corregir la medición del ${formatShortDate(measurement.measurementDate)}`}
                  onClick={() => editMeasurement(measurement)}
                >
                  <Pencil aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Eliminar la medición del ${formatShortDate(measurement.measurementDate)}`}
                  onClick={() => void removeMeasurement(measurement)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
