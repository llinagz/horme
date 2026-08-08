"use client";

import dynamic from "next/dynamic";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { getCurrentBodyValues } from "@/domain/calculations";
import { formatLocalDate, getTodayLocalDate } from "@/domain/dates";
import type { BodyMeasurement } from "@/domain/entities";
import { parseLocalizedNumber } from "@/domain/validation";
import { athleteProfileRepository } from "@/infrastructure/repositories/athlete-profile-repository";
import {
  bodyMeasurementRepository,
  type BodyMeasurementInput,
} from "@/infrastructure/repositories/body-measurement-repository";
import {
  useAthleteProfile,
  useBodyMeasurements,
} from "@/components/data-hooks";
import { InlineMessage, PageHeading, SectionHeading } from "@/components/ui";

const ProgressChart = dynamic(
  () =>
    import("@/components/progress-chart").then(
      (module) => module.ProgressChart,
    ),
  { ssr: false },
);

function getErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? "Revisa los datos";
  return error instanceof Error ? error.message : "No se ha podido guardar";
}

export function ProfileScreen() {
  const profile = useAthleteProfile();
  const measurements = useBodyMeasurements();
  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [measurementDate, setMeasurementDate] = useState(getTodayLocalDate());
  const [weight, setWeight] = useState("");
  const [editingMeasurementId, setEditingMeasurementId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);
  const currentValues = getCurrentBodyValues(measurements);

  const resetMeasurementForm = () => {
    setEditingMeasurementId(null);
    setMeasurementDate(getTodayLocalDate());
    setWeight("");
  };

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await athleteProfileRepository.updateDisplayName(displayName);
      setIsEditingName(false);
      setMessage({ text: "Nombre actualizado", tone: "success" });
    } catch (error) {
      setMessage({ text: getErrorMessage(error), tone: "error" });
    }
  };

  const handleMeasurementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedWeight = parseLocalizedNumber(weight);
    const input: BodyMeasurementInput = {
      measurementDate,
      ...(parsedWeight !== undefined ? { weightKilograms: parsedWeight } : {}),
    };
    try {
      if (editingMeasurementId)
        await bodyMeasurementRepository.update(editingMeasurementId, input);
      else await bodyMeasurementRepository.create(input);
      setMessage({
        text: editingMeasurementId ? "Medición corregida" : "Medición añadida",
        tone: "success",
      });
      resetMeasurementForm();
    } catch (error) {
      setMessage({ text: getErrorMessage(error), tone: "error" });
    }
  };

  const handleEditMeasurement = (measurement: BodyMeasurement) => {
    setEditingMeasurementId(measurement.bodyMeasurementId);
    setMeasurementDate(measurement.measurementDate);
    setWeight(measurement.weightKilograms?.toString() ?? "");
    setMessage(null);
    document
      .querySelector<HTMLFormElement>("#measurement-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleRemoveMeasurement = async (bodyMeasurementId: string) => {
    if (
      !window.confirm(
        "¿Eliminar esta medición? Esta acción no se puede deshacer.",
      )
    )
      return;
    try {
      await bodyMeasurementRepository.remove(bodyMeasurementId);
      setMessage({ text: "Medición eliminada", tone: "success" });
    } catch (error) {
      setMessage({ text: getErrorMessage(error), tone: "error" });
    }
  };

  const weightData = measurements.flatMap((measurement) =>
    measurement.weightKilograms === undefined
      ? []
      : [
          {
            date: measurement.measurementDate,
            value: measurement.weightKilograms,
          },
        ],
  );

  return (
    <div className="stack-large">
      <PageHeading
        eyebrow="Datos locales"
        title="Perfil"
        description="Tu identidad y evolución corporal, guardadas solo en este dispositivo."
      />

      <section className="profile-identity marble-card">
        <span className="avatar avatar-large">
          {profile?.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="grow">
          {isEditingName ? (
            <form className="inline-form" onSubmit={handleNameSubmit}>
              <label className="sr-only" htmlFor="profile-name">
                Nombre
              </label>
              <input
                id="profile-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoFocus
                maxLength={50}
              />
              <button className="small-button" type="submit">
                Guardar
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => setIsEditingName(false)}
              >
                Cancelar
              </button>
            </form>
          ) : (
            <>
              <h2>{profile?.displayName}</h2>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setDisplayName(profile?.displayName ?? "");
                  setIsEditingName(true);
                }}
              >
                Editar nombre
              </button>
            </>
          )}
        </div>
      </section>

      <div className="summary-grid">
        <article className="stat-card">
          <span className="stat-label">Altura actual</span>
          <strong>
            {currentValues.heightCentimeters ?? "—"}
            <small> cm</small>
          </strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Peso actual</span>
          <strong>
            {currentValues.weightKilograms ?? "—"}
            <small> kg</small>
          </strong>
        </article>
      </div>

      <section className="chart-card">
        <SectionHeading title="Evolución de peso" />
        <ProgressChart
          data={weightData}
          series={[
            { dataKey: "value", label: "Peso", color: "#9a6a3a", unit: " kg" },
          ]}
        />
      </section>

      <section className="form-card" id="measurement-form">
        <SectionHeading
          title={editingMeasurementId ? "Corregir medición" : "Añadir medición"}
        />
        <form
          className="form-stack"
          onSubmit={handleMeasurementSubmit}
          noValidate
        >
          <label className="field">
            <span>Fecha</span>
            <input
              type="date"
              value={measurementDate}
              onChange={(event) => setMeasurementDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Peso</span>
            <div className="input-with-unit">
              <input
                inputMode="decimal"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="Opcional"
              />
              <span>kg</span>
            </div>
          </label>
          {message ? (
            <InlineMessage tone={message.tone}>{message.text}</InlineMessage>
          ) : null}
          <div className="button-row">
            <button type="submit" className="primary-button">
              {editingMeasurementId ? "Guardar corrección" : "Añadir medición"}
            </button>
            {editingMeasurementId ? (
              <button
                type="button"
                className="secondary-button"
                onClick={resetMeasurementForm}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section>
        <SectionHeading title="Historial de mediciones" />
        <div className="list-card">
          {measurements.toReversed().map((measurement) => (
            <div
              className="measurement-row"
              key={measurement.bodyMeasurementId}
            >
              <span>
                <strong>{formatLocalDate(measurement.measurementDate)}</strong>
                <small>
                  {measurement.heightCentimeters !== undefined
                    ? `${measurement.heightCentimeters} cm`
                    : "Sin altura"}{" "}
                  ·{" "}
                  {measurement.weightKilograms !== undefined
                    ? `${measurement.weightKilograms} kg`
                    : "Sin peso"}
                </small>
              </span>
              <span className="compact-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Editar medición"
                  onClick={() => handleEditMeasurement(measurement)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-button danger"
                  aria-label="Eliminar medición"
                  onClick={() =>
                    handleRemoveMeasurement(measurement.bodyMeasurementId)
                  }
                >
                  ×
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
