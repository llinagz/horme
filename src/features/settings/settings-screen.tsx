"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { ExerciseCategory, ExerciseMetric } from "@/domain/entities";
import {
  createBackup,
  getBackupFileName,
  getBackupStatus,
  markBackupCreated,
  previewBackup,
  replaceDatabaseFromBackup,
  type BackupPreview,
  type BackupStatus,
  type HormeBackup,
} from "@/infrastructure/backup";
import { exerciseDefinitionRepository } from "@/infrastructure/repositories/exercise-definition-repository";
import { InlineMessage, PageHeading, SectionHeading } from "@/components/ui";

const metricOptions: Array<{ value: ExerciseMetric; label: string }> = [
  { value: "repetitions", label: "Repeticiones" },
  { value: "weightKilograms", label: "Carga" },
  { value: "durationSeconds", label: "Tiempo" },
  { value: "distanceMeters", label: "Distancia" },
  { value: "calories", label: "Calorías" },
];

const defaultBackupStatus: BackupStatus = { shouldRemind: false };

function downloadJson(
  backup: HormeBackup,
  fileName = getBackupFileName(),
): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function SettingsScreen() {
  const router = useRouter();
  const backupStatus = useLiveQuery(
    () => getBackupStatus(),
    [],
    defaultBackupStatus,
  );
  const customExercises = useLiveQuery(
    async () =>
      (
        await exerciseDefinitionRepository.list({ includeArchived: true })
      ).filter((item) => item.origin === "custom"),
    [],
    [],
  );
  const [message, setMessage] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<HormeBackup | null>(
    null,
  );
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(
    null,
  );
  const [shouldDownloadCurrent, setShouldDownloadCurrent] = useState(true);
  const [isStoragePersistent, setIsStoragePersistent] = useState<
    boolean | null
  >(null);
  const [selectedMetrics, setSelectedMetrics] = useState<ExerciseMetric[]>([
    "repetitions",
    "weightKilograms",
  ]);

  useEffect(() => {
    if ("storage" in navigator && "persisted" in navigator.storage)
      void navigator.storage.persisted().then(setIsStoragePersistent);
  }, []);

  const handleExport = async () => {
    try {
      const backup = await createBackup();
      downloadJson(backup);
      await markBackupCreated(backup.exportedAt);
      setMessage({
        text: "Copia descargada. Guárdala en una ubicación personal segura.",
        tone: "success",
      });
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "No se ha podido crear la copia",
        tone: "error",
      });
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const value: unknown = JSON.parse(await file.text());
      const preview = previewBackup(value);
      setSelectedBackup(value as HormeBackup);
      setBackupPreview(preview);
      setMessage(null);
    } catch (error) {
      setSelectedBackup(null);
      setBackupPreview(null);
      setMessage({
        text:
          error instanceof Error
            ? `Archivo rechazado: ${error.message}`
            : "El archivo no es una copia válida de Hormé",
        tone: "error",
      });
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup || !backupPreview) return;
    if (
      !window.confirm(
        "La restauración reemplazará por completo los datos actuales. ¿Continuar?",
      )
    )
      return;
    try {
      if (shouldDownloadCurrent)
        downloadJson(await createBackup(), getBackupFileName());
      await replaceDatabaseFromBackup(selectedBackup);
      router.replace("/");
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "La restauración ha fallado; los datos anteriores siguen intactos",
        tone: "error",
      });
    }
  };

  const handleCustomExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await exerciseDefinitionRepository.createCustom({
        name: String(form.get("name") ?? ""),
        englishAlias: String(form.get("englishAlias") ?? ""),
        category: String(form.get("category")) as ExerciseCategory,
        metrics: selectedMetrics,
      });
      event.currentTarget.reset();
      setSelectedMetrics(["repetitions", "weightKilograms"]);
      setMessage({ text: "Ejercicio personalizado creado", tone: "success" });
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "No se ha podido crear el ejercicio",
        tone: "error",
      });
    }
  };

  return (
    <div className="stack-large">
      <PageHeading
        eyebrow="Privacidad y datos"
        title="Ajustes"
        description="Hormé funciona sin cuenta, servidor, publicidad ni telemetría."
      />
      {message ? (
        <InlineMessage tone={message.tone}>{message.text}</InlineMessage>
      ) : null}

      <section className="settings-card">
        <SectionHeading title="Perfil" />
        <Link href="/profile" className="settings-row">
          <span className="settings-icon">♙</span>
          <span>
            <strong>Nombre y mediciones</strong>
            <small>Edita tu identidad y evolución corporal</small>
          </span>
          <span>›</span>
        </Link>
      </section>

      <section className="settings-card">
        <SectionHeading title="Almacenamiento local" />
        <div className="storage-status">
          <span
            className={isStoragePersistent ? "status-dot ok" : "status-dot"}
          />
          <span>
            <strong>
              {isStoragePersistent
                ? "Almacenamiento persistente concedido"
                : "Datos guardados en este navegador"}
            </strong>
            <small>
              {isStoragePersistent
                ? "El navegador evitará borrarlos automáticamente."
                : "Hormé ha solicitado protección persistente cuando el navegador la permite."}
            </small>
          </span>
        </div>
      </section>

      <section
        className={
          backupStatus.shouldRemind
            ? "settings-card highlighted"
            : "settings-card"
        }
      >
        <SectionHeading title="Copia de seguridad" />
        <p className="muted">
          Incluye perfil, mediciones, catálogo y entrenamientos. El JSON no está
          cifrado.
        </p>
        {backupStatus.shouldRemind ? (
          <InlineMessage>{backupStatus.reason}</InlineMessage>
        ) : null}
        <button type="button" className="primary-button" onClick={handleExport}>
          Descargar copia actual
        </button>
        <small className="block-note">
          {backupStatus.lastBackupAt
            ? `Última copia: ${new Date(backupStatus.lastBackupAt).toLocaleString("es-ES")}`
            : "Aún no hay ninguna copia registrada"}
        </small>
      </section>

      <section className="settings-card">
        <SectionHeading title="Restaurar una copia" />
        <label className="file-picker">
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
          />
          <span>Seleccionar archivo JSON</span>
        </label>
        {backupPreview ? (
          <div className="backup-preview">
            <span>
              <small>Perfil</small>
              <strong>{backupPreview.displayName ?? "Sin perfil"}</strong>
            </span>
            <span>
              <small>Sesiones</small>
              <strong>{backupPreview.sessionCount}</strong>
            </span>
            <span>
              <small>Mediciones</small>
              <strong>{backupPreview.measurementCount}</strong>
            </span>
            <span>
              <small>Rango</small>
              <strong>
                {backupPreview.firstSessionDate
                  ? `${backupPreview.firstSessionDate} — ${backupPreview.lastSessionDate}`
                  : "Sin sesiones"}
              </strong>
            </span>
          </div>
        ) : null}
        {selectedBackup ? (
          <>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={shouldDownloadCurrent}
                onChange={(event) =>
                  setShouldDownloadCurrent(event.target.checked)
                }
              />
              <span>Descargar antes los datos actuales</span>
            </label>
            <button
              type="button"
              className="danger-button"
              onClick={handleRestore}
            >
              Reemplazar todos los datos
            </button>
          </>
        ) : null}
      </section>

      <section className="settings-card">
        <SectionHeading title="Ejercicios personalizados" />
        <form className="form-stack" onSubmit={handleCustomExercise}>
          <div className="two-columns">
            <label className="field">
              <span>Nombre en español</span>
              <input name="name" required />
            </label>
            <label className="field">
              <span>Alias inglés</span>
              <input name="englishAlias" />
            </label>
          </div>
          <label className="field">
            <span>Categoría</span>
            <select name="category" defaultValue="material-funcional">
              <option value="fuerza-halterofilia">Fuerza y halterofilia</option>
              <option value="gimnasia">Gimnasia</option>
              <option value="peso-corporal">Peso corporal</option>
              <option value="monoestructural">Monoestructural</option>
              <option value="material-funcional">Material funcional</option>
            </select>
          </label>
          <fieldset className="metric-fieldset">
            <legend>Métricas aplicables</legend>
            {metricOptions.map((option) => (
              <label className="checkbox-field" key={option.value}>
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(option.value)}
                  onChange={(event) =>
                    setSelectedMetrics((current) =>
                      event.target.checked
                        ? [...current, option.value]
                        : current.filter((item) => item !== option.value),
                    )
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <button type="submit" className="secondary-button">
            Crear ejercicio
          </button>
        </form>
        {customExercises.length > 0 ? (
          <div className="custom-exercise-list">
            {customExercises.map((exercise) => (
              <div
                className="measurement-row"
                key={exercise.exerciseDefinitionId}
              >
                <span>
                  <strong>{exercise.name}</strong>
                  <small>
                    {exercise.isArchived
                      ? "Archivado"
                      : exercise.englishAlias || "Personalizado"}
                  </small>
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    void exerciseDefinitionRepository.setArchived(
                      exercise.exerciseDefinitionId,
                      !exercise.isArchived,
                    )
                  }
                >
                  {exercise.isArchived ? "Restaurar" : "Archivar"}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <footer className="settings-footer">
        <div className="brand-mark brand-mark-small">Η</div>
        <strong>Hormé 0.1.0</strong>
        <span>Todo tu esfuerzo, solo tuyo.</span>
      </footer>
    </div>
  );
}
