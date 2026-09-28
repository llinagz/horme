"use client";

import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Upload } from "lucide-react";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react";
import packageInfo from "../../../package.json";
import type { ExerciseCategory, ExerciseMetric } from "@/domain/entities";
import { getErrorMessage } from "@/domain/errors";
import { formatShortDate } from "@/domain/format";
import {
  exerciseCategoryLabels,
  exerciseMetricLabels,
  toOptions,
} from "@/domain/labels";
import {
  createBackup,
  getBackupFileName,
  getBackupStatus,
  markBackupCreated,
  parseBackup,
  previewBackup,
  replaceDatabaseFromBackup,
  type BackupPreview,
  type HormeBackup,
} from "@/infrastructure/backup";
import { exerciseDefinitionRepository } from "@/infrastructure/repositories/exercise-definition-repository";
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/components/theme";
import { useConfirm } from "@/components/ui/sheet";
import { InlineMessage, PageHeader, Segmented } from "@/components/ui/states";
import { useAction, useToast } from "@/components/ui/toast";
import styles from "./settings.module.css";

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "Como el móvil" },
  { value: "light", label: "Mármol" },
  { value: "dark", label: "Mármol negro" },
];

const metricOptions = (
  Object.keys(exerciseMetricLabels) as ExerciseMetric[]
).map((metric) => ({
  value: metric,
  label: exerciseMetricLabels[metric].label,
}));

const subscribeToNothing = () => () => {};

function downloadJson(value: unknown, fileName: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Revocar en el mismo tick puede cortar la descarga en Safari y Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SettingsScreen() {
  const router = useRouter();
  const run = useAction();
  const { show } = useToast();
  const confirm = useConfirm();
  const backupStatus = useLiveQuery(() => getBackupStatus());
  const customExercises = useLiveQuery(async () =>
    (await exerciseDefinitionRepository.list({ includeArchived: true })).filter(
      (item) => item.origin === "custom",
    ),
  );
  // El tema vive en localStorage: se lee sin efecto y sin romper la hidratación.
  const storedTheme = useSyncExternalStore(
    subscribeToNothing,
    getThemePreference,
    () => "system" as const,
  );
  const [chosenTheme, setChosenTheme] = useState<ThemePreference | null>(null);
  const theme = chosenTheme ?? storedTheme;
  const [selectedBackup, setSelectedBackup] = useState<HormeBackup | null>(
    null,
  );
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(
    null,
  );
  const [restoreError, setRestoreError] = useState("");
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

  const changeTheme = (preference: ThemePreference | undefined) => {
    if (!preference) return;
    setChosenTheme(preference);
    setThemePreference(preference);
  };

  const exportBackup = () =>
    void run(
      async () => {
        const backup = await createBackup();
        downloadJson(backup, getBackupFileName());
        await markBackupCreated(backup.exportedAt);
      },
      { success: "Copia descargada. Guárdala fuera del móvil." },
    );

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const value: unknown = JSON.parse(await file.text());
      setBackupPreview(previewBackup(value));
      setSelectedBackup(parseBackup(value));
      setRestoreError("");
    } catch (error) {
      setSelectedBackup(null);
      setBackupPreview(null);
      setRestoreError(
        error instanceof SyntaxError
          ? "Este archivo no es una copia de Hormé."
          : `No se puede usar este archivo: ${getErrorMessage(error)}`,
      );
    }
  };

  const restore = async () => {
    if (!selectedBackup) return;
    const accepted = await confirm({
      title: "¿Reemplazar todos los datos?",
      description:
        "Lo que hay ahora en este móvil se sustituirá por la copia. Si algo falla, tus datos actuales se quedan como están.",
      confirmLabel: "Reemplazar datos",
      tone: "danger",
    });
    if (!accepted) return;
    const restored = await run(async () => {
      if (shouldDownloadCurrent)
        downloadJson(
          await createBackup(),
          getBackupFileName().replace(".json", "-antes-de-restaurar.json"),
        );
      await replaceDatabaseFromBackup(selectedBackup);
      return true;
    });
    if (restored) {
      show({ message: "Copia restaurada" });
      router.replace("/");
    }
  };

  const createExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const created = await run(
      async () => {
        await exerciseDefinitionRepository.createCustom({
          name: String(data.get("name") ?? ""),
          englishAlias: String(data.get("englishAlias") ?? ""),
          category: String(data.get("category")) as ExerciseCategory,
          metrics: selectedMetrics,
        });
        return true;
      },
      { success: "Ejercicio creado" },
    );
    if (created) {
      form.reset();
      setSelectedMetrics(["repetitions", "weightKilograms"]);
    }
  };

  return (
    <div className="stack-large">
      <PageHeader
        title="Ajustes"
        subtitle="Sin cuenta, sin servidor y sin anuncios. Todo se queda en este móvil."
      />

      <section className="section">
        <h2 className="heading">Apariencia</h2>
        <Segmented
          label="Tema"
          options={themeOptions}
          value={theme}
          onChange={changeTheme}
        />
      </section>

      <section
        className={
          backupStatus?.shouldRemind
            ? `sheet-card ${styles.attention}`
            : "sheet-card"
        }
      >
        <div className="stack">
          <h2 className="heading">Copia de seguridad</h2>
          <p className="muted small">
            Si borras los datos del navegador o cambias de móvil, solo podrás
            recuperar tus entrenos con una copia. Incluye perfil, mediciones,
            ejercicios y sesiones, sin cifrar.
          </p>
          {backupStatus?.shouldRemind && backupStatus.reason ? (
            <InlineMessage tone="attention">
              {backupStatus.reason}
            </InlineMessage>
          ) : null}
        </div>
        <button
          type="button"
          className="button primary large"
          onClick={exportBackup}
        >
          <Download aria-hidden="true" size={20} />
          Descargar copia
        </button>
        {backupStatus?.lastBackupAt ? (
          <p className="muted small">
            Última copia el{" "}
            {new Date(backupStatus.lastBackupAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
            })}
          </p>
        ) : null}
      </section>

      <section className="sheet-card">
        <h2 className="heading">Restaurar una copia</h2>
        <label className={`button large ${styles.filePicker}`}>
          <Upload aria-hidden="true" size={20} />
          Elegir archivo de copia
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => void chooseFile(event)}
          />
        </label>
        {restoreError ? (
          <InlineMessage tone="error">{restoreError}</InlineMessage>
        ) : null}
        {backupPreview ? (
          <dl className={styles.preview}>
            <div>
              <dt>Perfil</dt>
              <dd>{backupPreview.displayName ?? "Sin perfil"}</dd>
            </div>
            <div>
              <dt>Sesiones</dt>
              <dd>{backupPreview.sessionCount}</dd>
            </div>
            <div>
              <dt>Mediciones</dt>
              <dd>{backupPreview.measurementCount}</dd>
            </div>
            <div>
              <dt>Fechas</dt>
              <dd>
                {backupPreview.firstSessionDate && backupPreview.lastSessionDate
                  ? `${formatShortDate(backupPreview.firstSessionDate)} a ${formatShortDate(backupPreview.lastSessionDate)}`
                  : "Sin sesiones"}
              </dd>
            </div>
          </dl>
        ) : null}
        {selectedBackup ? (
          <>
            <label className="toggle">
              <input
                type="checkbox"
                checked={shouldDownloadCurrent}
                onChange={(event) =>
                  setShouldDownloadCurrent(event.target.checked)
                }
              />
              <span>Descargar antes una copia de lo que hay ahora</span>
            </label>
            <button
              type="button"
              className="button large danger"
              onClick={() => void restore()}
            >
              Reemplazar todos los datos
            </button>
          </>
        ) : null}
      </section>

      <section className="sheet-card">
        <h2 className="heading">Ejercicios propios</h2>
        <form
          className="stack"
          onSubmit={(event) => void createExercise(event)}
        >
          <div className="field-row">
            <label className="field">
              <span>Nombre</span>
              <input name="name" required maxLength={60} />
            </label>
            <label className="field">
              <span>Nombre en inglés</span>
              <input
                name="englishAlias"
                maxLength={60}
                placeholder="Opcional"
              />
            </label>
          </div>
          <label className="field">
            <span>Categoría</span>
            <select name="category" defaultValue="material-funcional">
              {toOptions(exerciseCategoryLabels).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={styles.metrics}>
            <legend className="field-label">Qué vas a apuntar</legend>
            {metricOptions.map((option) => (
              <label className="toggle" key={option.value}>
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
          <button type="submit" className="button">
            Crear ejercicio
          </button>
        </form>
        {customExercises && customExercises.length > 0 ? (
          <div className="list">
            {customExercises.map((exercise) => (
              <div key={exercise.exerciseDefinitionId} className="list-row">
                <div>
                  <strong>{exercise.name}</strong>
                  <p>
                    {exercise.isArchived
                      ? "Archivado, no aparece al añadir ejercicios"
                      : exerciseCategoryLabels[exercise.category]}
                  </p>
                </div>
                <button
                  type="button"
                  className="button quiet"
                  onClick={() =>
                    void run(() =>
                      exerciseDefinitionRepository.setArchived(
                        exercise.exerciseDefinitionId,
                        !exercise.isArchived,
                      ),
                    )
                  }
                >
                  {exercise.isArchived ? "Recuperar" : "Archivar"}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="section">
        <h2 className="heading">Almacenamiento</h2>
        <p className="muted small">
          {isStoragePersistent
            ? "El navegador ha aceptado no borrar tus datos por falta de espacio."
            : "El navegador podría borrar los datos si le falta espacio. Instala Hormé en la pantalla de inicio y haz copias a menudo."}
        </p>
      </section>

      <footer className={styles.footer}>
        <span className="brand-mark" aria-hidden="true">
          Η
        </span>
        <span>Hormé {packageInfo.version}</span>
      </footer>
    </div>
  );
}
