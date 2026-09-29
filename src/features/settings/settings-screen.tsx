"use client";

import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Upload } from "lucide-react";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import packageInfo from "../../../package.json";
import { groupBy } from "@/domain/collections";
import type { ExerciseDefinition } from "@/domain/entities";
import { getErrorMessage } from "@/domain/errors";
import { classificationLabel } from "@/domain/exercises";
import { formatShortDate } from "@/domain/format";
import { muscleGroupLabels, toOptions } from "@/domain/labels";
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
import {
  CustomExerciseForm,
  type ExerciseFormValues,
} from "@/features/exercises/custom-exercise-form";
import { Sheet, useConfirm } from "@/components/ui/sheet";
import { InlineMessage, PageHeader, Segmented } from "@/components/ui/states";
import { useAction, useToast } from "@/components/ui/toast";
import styles from "./settings.module.css";

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "Como el móvil" },
  { value: "light", label: "Mármol" },
  { value: "dark", label: "Mármol negro" },
];

const muscleGroupOrder = toOptions(muscleGroupLabels);

function toFormValues(exercise: ExerciseDefinition): ExerciseFormValues {
  return {
    name: exercise.name,
    englishAlias: exercise.englishAlias,
    muscleGroup: exercise.muscleGroup,
    secondaryMuscleGroups: exercise.secondaryMuscleGroups,
    equipment: exercise.equipment,
    metrics: exercise.metrics,
  };
}

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
  const customExercisesByGroup = groupBy(
    customExercises ?? [],
    (exercise) => exercise.muscleGroup,
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
  const [editedExercise, setEditedExercise] =
    useState<ExerciseDefinition | null>(null);

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
        <CustomExerciseForm
          submitLabel="Crear ejercicio"
          onSubmit={async (exercise) => {
            await exerciseDefinitionRepository.createCustom(exercise);
            show({ message: "Ejercicio creado" });
          }}
        />
        {customExercises && customExercises.length > 0
          ? muscleGroupOrder.map(({ value: group, label }) => {
              const items = customExercisesByGroup.get(group);
              if (!items) return null;
              return (
                <div key={group} className="stack">
                  <h3 className="field-label">{label}</h3>
                  <div className="list">
                    {items.map((exercise) => (
                      <div
                        key={exercise.exerciseDefinitionId}
                        className="list-row"
                      >
                        <div>
                          <strong>{exercise.name}</strong>
                          <p>
                            {exercise.isArchived
                              ? "Archivado, no aparece al añadir ejercicios"
                              : classificationLabel(exercise)}
                          </p>
                        </div>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className="button quiet"
                            aria-label={`Editar ${exercise.name}`}
                            onClick={() => setEditedExercise(exercise)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="button quiet"
                            aria-label={`${exercise.isArchived ? "Recuperar" : "Archivar"} ${exercise.name}`}
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          : null}
      </section>

      <Sheet
        open={editedExercise !== null}
        title="Editar ejercicio"
        onClose={() => setEditedExercise(null)}
      >
        {editedExercise ? (
          <CustomExerciseForm
            key={editedExercise.exerciseDefinitionId}
            initialValues={toFormValues(editedExercise)}
            canEditMetrics={false}
            submitLabel="Guardar cambios"
            onCancel={() => setEditedExercise(null)}
            onSubmit={async (exercise) => {
              // Las métricas no se editan: cambiarlas dejaría huérfanas las series.
              await exerciseDefinitionRepository.updateCustom(
                editedExercise.exerciseDefinitionId,
                {
                  name: exercise.name,
                  englishAlias: exercise.englishAlias,
                  muscleGroup: exercise.muscleGroup,
                  secondaryMuscleGroups: exercise.secondaryMuscleGroups,
                  equipment: exercise.equipment,
                },
              );
              setEditedExercise(null);
              show({ message: "Ejercicio actualizado" });
            }}
          />
        ) : null}
      </Sheet>

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
