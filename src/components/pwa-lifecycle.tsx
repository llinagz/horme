"use client";

import { useEffect, useRef, useState } from "react";

export function PwaLifecycle() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const isRefreshing = useRef(false);
  const isUpdateRequested = useRef(false);

  useEffect(() => {
    if ("storage" in navigator && "persist" in navigator.storage)
      void navigator.storage.persist();
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;
    // El primer service worker también toma el control (`clientsClaim`); solo
    // se recarga cuando lo ha pedido el usuario, para no perder lo escrito.
    const handleControllerChange = () => {
      if (!isUpdateRequested.current || isRefreshing.current) return;
      isRefreshing.current = true;
      window.location.reload();
    };
    const detectWaitingWorker = () => {
      if (registration?.waiting) setWaitingWorker(registration.waiting);
    };
    const handleUpdateFound = () => {
      const installing = registration?.installing;
      if (!installing) return;
      installing.addEventListener("statechange", detectWaitingWorker);
    };

    void navigator.serviceWorker.ready.then((readyRegistration) => {
      registration = readyRegistration;
      detectWaitingWorker();
      registration.addEventListener("updatefound", handleUpdateFound);
      void registration.update();
    });
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    return () => {
      registration?.removeEventListener("updatefound", handleUpdateFound);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  if (!waitingWorker) return null;
  return (
    <aside className="update-banner" role="status">
      <span>Hay una versión nueva preparada.</span>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          isUpdateRequested.current = true;
          waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }}
      >
        Actualizar ahora
      </button>
    </aside>
  );
}
