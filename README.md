# Hormé

Hormé es una PWA privada para llevar el registro de entrenamientos de CrossFit, medidas corporales y evolución personal. Funciona completamente en el navegador: no requiere cuenta ni envía datos a ningún servicio remoto.

## Funcionalidades

- Registro de entrenamientos y ejercicios.
- Seguimiento del perfil, medidas corporales y progreso.
- Historial y gráficos de evolución.
- Catálogo de ejercicios y flujos de incorporación.
- Copias de seguridad y restauración mediante archivos JSON validados.
- Instalación como aplicación web progresiva (PWA).

## Tecnologías

- [Next.js](https://nextjs.org/) 16 y [React](https://react.dev/) 19 para la interfaz.
- [TypeScript](https://www.typescriptlang.org/) para un código tipado y mantenible.
- [Dexie](https://dexie.org/) e IndexedDB para guardar los datos localmente en el dispositivo.
- [Recharts](https://recharts.org/) para las visualizaciones de progreso.
- [Serwist](https://serwist.pages.dev/) para la experiencia PWA y el funcionamiento sin conexión.
- ESLint, Prettier, Vitest y Playwright para calidad y pruebas.

## Requisitos

- Node.js 24 LTS o posterior
- npm 11 o posterior

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Los comandos de desarrollo y compilación usan Webpack porque es el empaquetador requerido por Serwist.

## Comprobaciones

```bash
npm run check
npm run test:e2e
```

`npm run build` genera una exportación estática en `out/`.

## Privacidad y copias

El perfil y los entrenamientos se almacenan exclusivamente en IndexedDB, dentro del navegador. La aplicación no incluye rutas de API, Server Actions, variables de entorno ni servicios remotos.

Desde Ajustes se puede descargar una copia de seguridad JSON versionada y restaurarla después de validar su contenido. La copia no está cifrada: guárdala en una ubicación personal segura.
