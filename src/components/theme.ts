export type ThemePreference = "system" | "light" | "dark";

const storageKey = "horme-theme";

/**
 * El tema es una preferencia de este dispositivo, no un dato del
 * entrenamiento: vive en `localStorage` para poder aplicarse antes del primer
 * pintado, sin esperar a IndexedDB, y no forma parte de las copias.
 */
export const themeBootstrapScript = `try{var t=localStorage.getItem("${storageKey}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function setThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = preference;
  try {
    if (preference === "system") localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, preference);
  } catch {
    // Sin almacenamiento (modo privado) el tema se aplica solo a esta visita.
  }
}
