import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExerciseDefinition } from "@/domain/entities";
import { seedBuiltInExercises } from "@/infrastructure/database";
import { clearDatabase } from "@/test/database-helpers";
import { ExercisePicker } from "./exercise-picker";

beforeEach(async () => {
  await clearDatabase();
  await seedBuiltInExercises();
});
afterEach(cleanup);

async function renderPicker() {
  const onPick = vi.fn<(exercise: ExerciseDefinition) => void>();
  const user = userEvent.setup();
  render(<ExercisePicker open onClose={() => {}} onPick={onPick} />);
  await screen.findByRole("heading", { name: "Hombro" });
  return { onPick, user };
}

const option = (name: RegExp) => screen.queryByRole("button", { name });
const onlyKettlebell = (exercise: ExerciseDefinition) =>
  exercise.equipment === "kettlebell";

describe("selector de ejercicios", () => {
  it("agrupa los ejercicios por grupo muscular principal", async () => {
    await renderPicker();

    for (const group of ["Hombro", "Pecho", "Espalda", "Bíceps", "Cuádriceps"])
      expect(screen.getByRole("heading", { name: group })).toBeTruthy();
    expect(option(/^Curl de bíceps con mancuerna/)).toBeTruthy();
  });

  it("filtra por material con los chips", async () => {
    const { user } = await renderPicker();

    await user.click(screen.getByRole("radio", { name: "Kettlebell" }));

    expect(option(/^Swing con kettlebell/)).toBeTruthy();
    expect(option(/^Remo unilateral con kettlebell/)).toBeTruthy();
    expect(option(/^Press de banca con barra/)).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Kettlebell" }));
    expect(option(/^Press de banca con barra/)).toBeTruthy();
  });

  it("encuentra por grupo muscular principal y por secundarios", async () => {
    const { user } = await renderPicker();

    await user.type(screen.getByRole("searchbox"), "hombro");
    expect(option(/^Press de hombro sentado con mancuernas/)).toBeTruthy();
    // Solo aparece como secundario del press de banca.
    expect(option(/^Press de banca con barra/)).toBeTruthy();
    expect(option(/^Curl de bíceps/)).toBeNull();

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "glúteos");
    expect(option(/^Swing con kettlebell/)).toBeTruthy();
    expect(option(/^Zancadas caminando con mancuernas/)).toBeTruthy();
    expect(option(/^Curl de bíceps/)).toBeNull();
  });

  it("muestra el material y los grupos secundarios de cada ejercicio", async () => {
    await renderPicker();

    const lunge = screen.getByRole("button", {
      name: /^Zancadas caminando con mancuernas/,
    });
    expect(lunge.textContent).toContain("Dumbbell Walking Lunge");
    expect(lunge.textContent).toContain("Mancuerna");
    expect(lunge.textContent).toContain("también Glúteos");
  });

  it("crea un ejercicio nuevo ya clasificado y lo añade", async () => {
    const { onPick, user } = await renderPicker();

    await user.type(screen.getByRole("searchbox"), "Hip thrust con barra");
    expect(screen.getByText("Ningún ejercicio coincide.")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Crear «Hip thrust con barra»" }),
    );

    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe(
      "Hip thrust con barra",
    );
    await user.selectOptions(
      screen.getByLabelText("Grupo muscular principal"),
      "gluteos",
    );
    await user.selectOptions(screen.getByLabelText("Material"), "barra");
    await user.click(
      within(
        screen.getByRole("group", { name: "Grupos musculares secundarios" }),
      ).getByRole("button", { name: "Isquios" }),
    );
    await user.click(screen.getByRole("button", { name: "Crear y añadir" }));

    await vi.waitFor(() => expect(onPick).toHaveBeenCalledOnce());
    expect(onPick.mock.calls[0]?.[0]).toMatchObject({
      name: "Hip thrust con barra",
      origin: "custom",
      muscleGroup: "gluteos",
      secondaryMuscleGroups: ["isquios"],
      equipment: "barra",
    });
  });

  it("solo ofrece los ejercicios que pasan el filtro", async () => {
    const user = userEvent.setup();
    render(
      <ExercisePicker
        open
        onClose={() => {}}
        onPick={() => {}}
        filter={onlyKettlebell}
      />,
    );
    await screen.findByRole("button", { name: /^Swing con kettlebell/ });

    expect(option(/^Swing con kettlebell/)).toBeTruthy();
    expect(option(/^Press de banca con barra/)).toBeNull();
    expect(screen.queryByRole("radio", { name: "Barra" })).toBeNull();

    await user.type(screen.getByRole("searchbox"), "banca");
    expect(option(/^Press de banca con barra/)).toBeNull();
  });

  it("no deja elegir como secundario el grupo principal", async () => {
    const { user } = await renderPicker();

    await user.type(screen.getByRole("searchbox"), "Algo nuevo");
    await user.click(
      screen.getByRole("button", { name: "Crear «Algo nuevo»" }),
    );
    await user.selectOptions(
      screen.getByLabelText("Grupo muscular principal"),
      "gluteos",
    );

    const group = screen.getByRole("group", {
      name: "Grupos musculares secundarios",
    });
    expect(
      (
        within(group).getByRole("button", {
          name: "Glúteos",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
