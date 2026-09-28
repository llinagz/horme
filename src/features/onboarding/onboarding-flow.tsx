"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { completeOnboarding } from "@/application/complete-onboarding";
import { getTodayLocalDate } from "@/domain/dates";
import { getErrorMessage } from "@/domain/errors";
import { displayNameSchema, parseLocalizedNumber } from "@/domain/validation";
import { useAthleteProfile } from "@/components/data-hooks";
import { InlineMessage } from "@/components/ui/states";
import styles from "./onboarding.module.css";

export function OnboardingFlow() {
  const router = useRouter();
  const existingProfile = useAthleteProfile();
  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState("");
  const [measurementDate, setMeasurementDate] = useState(getTodayLocalDate());
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingProfile) router.replace("/");
  }, [existingProfile, router]);

  const submitName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = displayNameSchema.safeParse(displayName);
    if (!result.success) {
      setErrorMessage(result.error.issues[0]?.message ?? "Revisa tu nombre");
      return;
    }
    setDisplayName(result.data);
    setErrorMessage("");
    setStep(2);
  };

  const submitMeasurement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await completeOnboarding({
        displayName,
        measurementDate,
        heightCentimeters: parseLocalizedNumber(height),
        weightKilograms: parseLocalizedNumber(weight),
      });
      router.replace("/");
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "No se ha podido crear el perfil"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page} data-navigation="false">
      <div className={styles.card}>
        <header className={styles.header}>
          <span className="brand-mark large" aria-hidden="true">
            Η
          </span>
          <p className={styles.step}>Paso {step} de 2</p>
          <h1 className="title">
            {step === 1 ? "Hormé" : `Encantado, ${displayName}`}
          </h1>
          <p className="muted">
            {step === 1
              ? "Tu diario de CrossFit: series, WOD y progreso. Sin cuentas ni anuncios, y todo se guarda solo en este móvil."
              : "Una primera medición para empezar tu registro. Luego podrás añadir el peso cuando quieras."}
          </p>
        </header>

        {step === 1 ? (
          <form className="stack" onSubmit={submitName} noValidate>
            <label className="field">
              <span>Cómo te llamas</span>
              <input
                autoFocus
                autoComplete="given-name"
                maxLength={50}
                value={displayName}
                placeholder="Tu nombre"
                enterKeyHint="next"
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            {errorMessage ? (
              <InlineMessage tone="error">{errorMessage}</InlineMessage>
            ) : null}
            <button type="submit" className="button primary large full">
              Continuar
            </button>
          </form>
        ) : (
          <form
            className="stack"
            onSubmit={(event) => void submitMeasurement(event)}
            noValidate
          >
            <div className="field-row">
              <label className="field">
                <span>Altura</span>
                <span className="with-unit">
                  <input
                    inputMode="decimal"
                    value={height}
                    placeholder="175"
                    onChange={(event) => setHeight(event.target.value)}
                  />
                  <span>cm</span>
                </span>
              </label>
              <label className="field">
                <span>Peso</span>
                <span className="with-unit">
                  <input
                    inputMode="decimal"
                    value={weight}
                    placeholder="75,5"
                    onChange={(event) => setWeight(event.target.value)}
                  />
                  <span>kg</span>
                </span>
              </label>
            </div>
            <label className="field">
              <span>Fecha</span>
              <input
                type="date"
                required
                value={measurementDate}
                onChange={(event) => setMeasurementDate(event.target.value)}
              />
            </label>
            {errorMessage ? (
              <InlineMessage tone="error">{errorMessage}</InlineMessage>
            ) : null}
            <div className={styles.actions}>
              <button
                type="button"
                className="button large"
                onClick={() => {
                  setErrorMessage("");
                  setStep(1);
                }}
              >
                Atrás
              </button>
              <button
                type="submit"
                className="button primary large"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando…" : "Entrar en Hormé"}
              </button>
            </div>
            <p className={styles.privacy}>
              Tus datos no salen de este móvil. Haz copias desde Ajustes para no
              perderlos si cambias de teléfono.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
