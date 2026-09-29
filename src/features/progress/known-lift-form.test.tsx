import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExerciseDefinition, KnownLift } from "@/domain/entities";
import { database } from "@/infrastructure/database";
import { knownLiftRepository } from "@/infrastructure/repositories/known-lift-repository";
import { addTestExercise, clearDatabase } from "@/test/database-helpers";
import { ToastProvider } from "@/components/ui/toast";
import { KnownLiftSheet } from "./known-lift-form";

let exercise: ExerciseDefinition;

beforeEach(async () => {
  await clearDatabase();
  exercise = await addTestExercise();
});
afterEach(cleanup);

function renderSheet(lift?: KnownLift) {
  const onClose = vi.fn();
  render(
    <ToastProvider>
      <KnownLiftSheet exercise={exercise} lift={lift} onClose={onClose} />
    </ToastProvider>,
  );
  return { onClose, user: userEvent.setup() };
}

describe("formulario de marca registrada", () => {
  it("guarda una marca con fecha", async () => {
    const { onClose, user } = renderSheet();

    await user.type(screen.getByLabelText(/^Peso/), "102,5");
    await user.type(screen.getByLabelText("Repeticiones"), "5");
    await user.click(screen.getByRole("button", { name: "Guardar marca" }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const [lift] = await knownLiftRepository.listByExercise("test-deadlift");
    expect(lift).toMatchObject({ weightKilograms: 102.5, repetitions: 5 });
    expect(lift?.recordDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("guarda la marca sin fecha si el usuario no la recuerda", async () => {
    const { onClose, user } = renderSheet();

    await user.type(screen.getByLabelText(/^Peso/), "100");
    await user.type(screen.getByLabelText("Repeticiones"), "3");
    await user.click(
      screen.getByRole("checkbox", { name: "No recuerdo la fecha" }),
    );
    expect((screen.getByLabelText("Fecha") as HTMLInputElement).disabled).toBe(
      true,
    );
    await user.click(screen.getByRole("button", { name: "Guardar marca" }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const [lift] = await knownLiftRepository.listByExercise("test-deadlift");
    expect(lift).toMatchObject({ weightKilograms: 100, repetitions: 3 });
    expect(lift).not.toHaveProperty("recordDate");
  });

  it("avisa de lo que falta o no es válido sin guardar nada", async () => {
    const { onClose, user } = renderSheet();

    await user.click(screen.getByRole("button", { name: "Guardar marca" }));
    expect(screen.getByText("Indica el peso")).toBeTruthy();

    await user.type(screen.getByLabelText(/^Peso/), "100");
    await user.click(screen.getByRole("button", { name: "Guardar marca" }));
    expect(screen.getByText("Indica las repeticiones")).toBeTruthy();

    await user.type(screen.getByLabelText("Repeticiones"), "2,5");
    await user.click(screen.getByRole("button", { name: "Guardar marca" }));
    expect(
      screen.getByText("Las repeticiones deben ser un número entero"),
    ).toBeTruthy();

    expect(onClose).not.toHaveBeenCalled();
    expect(await database.knownLifts.count()).toBe(0);
  });

  it("corrige una marca existente y conserva su identificador", async () => {
    const id = await knownLiftRepository.create({
      exerciseDefinitionId: "test-deadlift",
      weightKilograms: 100,
      repetitions: 5,
    });
    const [lift] = await knownLiftRepository.listByExercise("test-deadlift");
    const { onClose, user } = renderSheet(lift);

    const weight = screen.getByLabelText(/^Peso/) as HTMLInputElement;
    expect(weight.value).toBe("100");
    expect(
      (
        screen.getByRole("checkbox", {
          name: "No recuerdo la fecha",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    await user.clear(weight);
    await user.type(weight, "110");
    await user.click(
      screen.getByRole("button", { name: "Guardar corrección" }),
    );

    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const lifts = await knownLiftRepository.listByExercise("test-deadlift");
    expect(lifts).toHaveLength(1);
    expect(lifts[0]).toMatchObject({ knownLiftId: id, weightKilograms: 110 });
  });
});
