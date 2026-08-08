/* eslint-disable @typescript-eslint/no-require-imports -- Node preload hooks run before ESM. */
const Module = require("node:module");

const typescript6 = require("@typescript/typescript6");
const loadModule = Module._load;

// TypeScript 7.0 has no programmatic API yet. Keep ESLint on the official
// compatibility API without changing the TypeScript 7 compiler used by Hormé.
Module._load = function loadWithTypeScript6(request, parent, isMain) {
  if (request === "typescript") return typescript6;
  return loadModule.call(this, request, parent, isMain);
};
