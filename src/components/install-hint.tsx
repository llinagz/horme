"use client";

import { Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./install-hint.module.css";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const dismissedKey = "horme-install-dismissed";

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  );
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(dismissedKey) === "1";
  } catch {
    return false;
  }
}

function isIosSafari(): boolean {
  const agent = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(agent) && !/CriOS|FxiOS/.test(agent);
}

const subscribeToNothing = () => () => {};

/**
 * Invita a instalar Hormé en la pantalla de inicio: así abre sin barra del
 * navegador, funciona sin red y el navegador cuida más los datos guardados.
 */
export function InstallHint() {
  const shouldOffer = useSyncExternalStore(
    subscribeToNothing,
    () => !isInstalled() && !isDismissed(),
    () => false,
  );
  const isIos = useSyncExternalStore(
    subscribeToNothing,
    isIosSafari,
    () => false,
  );
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  if (!shouldOffer || isHidden || (!installEvent && !isIos)) return null;

  const dismiss = () => {
    setIsHidden(true);
    try {
      localStorage.setItem(dismissedKey, "1");
    } catch {
      // Sin almacenamiento el aviso vuelve a salir en la próxima visita.
    }
  };

  return (
    <aside className={styles.hint} aria-label="Instalar Hormé">
      <div className={styles.text}>
        <strong>Instala Hormé en tu móvil</strong>
        {installEvent ? (
          <span>Se abre como una app y funciona sin cobertura.</span>
        ) : (
          <span>
            En Safari, toca <Share aria-label="Compartir" size={16} /> y luego
            «Añadir a pantalla de inicio».
          </span>
        )}
      </div>
      {installEvent ? (
        <button
          type="button"
          className="button primary"
          onClick={() =>
            void installEvent.prompt().then(async () => {
              const choice = await installEvent.userChoice;
              if (choice.outcome === "accepted") setIsHidden(true);
            })
          }
        >
          Instalar
        </button>
      ) : null}
      <button
        type="button"
        className="icon-button"
        aria-label="No volver a mostrar"
        onClick={dismiss}
      >
        <X aria-hidden="true" />
      </button>
    </aside>
  );
}
