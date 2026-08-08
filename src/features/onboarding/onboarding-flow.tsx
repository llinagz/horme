"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { completeOnboarding } from "@/application/complete-onboarding";
import { getTodayLocalDate } from "@/domain/dates";
import { displayNameSchema, parseLocalizedNumber } from "@/domain/validation";
import { useAthleteProfile } from "@/components/data-hooks";
import { InlineMessage } from "@/components/ui";

function getErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? "Revisa los datos";
  return error instanceof Error
    ? error.message
    : "No se ha podido completar el perfil";
}

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

  const handleIdentitySubmit = (event: FormEvent<HTMLFormElement>) => {
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

  const handleMeasurementSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="onboarding-page">
      <div className="onboarding-decoration" aria-hidden="true">
        Η
      </div>
      <section className="onboarding-card">
        <header className="onboarding-header">
          <div className="brand-mark">Η</div>
          <p className="eyebrow">HORMÉ · PASO {step} DE 2</p>
          <h1>
            {step === 1 ? "Tu progreso te pertenece" : "Tu punto de partida"}
          </h1>
          <p>
            {step === 1
              ? "Hormé guarda todo exclusivamente en este dispositivo. Sin cuentas, anuncios ni seguimiento."
              : "Necesitamos una primera medición para construir tu cronología corporal."}
          </p>
        </header>

        {step === 1 ? (
          <form
            onSubmit={handleIdentitySubmit}
            className="form-stack"
            noValidate
          >
            <label className="field">
              <span>¿Cómo quieres que te llamemos?</span>
              <input
                autoFocus
                autoComplete="name"
                maxLength={50}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Tu nombre"
              />
            </label>
            {errorMessage ? (
              <InlineMessage tone="error">{errorMessage}</InlineMessage>
            ) : null}
            <button type="submit" className="primary-button full-width">
              Continuar
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleMeasurementSubmit}
            className="form-stack"
            noValidate
          >
            <label className="field">
              <span>Fecha de medición</span>
              <input
                type="date"
                value={measurementDate}
                onChange={(event) => setMeasurementDate(event.target.value)}
                required
              />
            </label>
            <div className="two-columns">
              <label className="field">
                <span>Altura</span>
                <div className="input-with-unit">
                  <input
                    inputMode="decimal"
                    value={height}
                    onChange={(event) => setHeight(event.target.value)}
                    placeholder="175"
                  />
                  <span>cm</span>
                </div>
              </label>
              <label className="field">
                <span>Peso</span>
                <div className="input-with-unit">
                  <input
                    inputMode="decimal"
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    placeholder="75,5"
                  />
                  <span>kg</span>
                </div>
              </label>
            </div>
            <p className="privacy-note">
              <span aria-hidden="true">⌾</span> El perfil y la medición se
              crearán juntos al confirmar.
            </p>
            {errorMessage ? (
              <InlineMessage tone="error">{errorMessage}</InlineMessage>
            ) : null}
            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setStep(1)}
              >
                Atrás
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando…" : "Entrar en Hormé"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
