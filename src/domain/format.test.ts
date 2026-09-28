import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatNumber,
  formatSessionTitle,
  formatShortDate,
  parseDuration,
  pluralize,
} from "./format";

describe("formato de números", () => {
  it("usa coma decimal y no agrupa miles", () => {
    expect(formatNumber(102.5)).toBe("102,5");
    expect(formatNumber(1200)).toBe("1200");
    expect(formatNumber(undefined)).toBe("");
    expect(pluralize(1, "serie")).toBe("1 serie");
    expect(pluralize(3, "serie")).toBe("3 series");
  });
});

describe("tiempos", () => {
  it("formatea segundos como minutos y segundos", () => {
    expect(formatDuration(252)).toBe("4:12");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(undefined)).toBe("");
  });

  it("lee tiempos escritos a mano", () => {
    expect(parseDuration("4:12")).toBe(252);
    expect(parseDuration(" 12 ")).toBe(720);
    expect(parseDuration("1:02:05")).toBe(3725);
    expect(parseDuration("412")).toBe(252);
    expect(parseDuration("1205")).toBe(725);
    expect(parseDuration("10205")).toBe(3725);
    expect(parseDuration("475")).toBeNull();
    expect(parseDuration("")).toBeUndefined();
    expect(parseDuration("4:75")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
  });

  it("ida y vuelta conserva el valor", () => {
    for (const seconds of [0, 5, 60, 252, 599, 3600, 4000])
      expect(parseDuration(formatDuration(seconds))).toBe(seconds);
  });
});

describe("fechas", () => {
  it("titula la sesión con el día de la semana", () => {
    expect(formatSessionTitle("2026-09-28")).toBe("Lunes 28");
    expect(formatShortDate("2026-09-14")).toMatch(/^14 sept?\.?$/);
  });
});
