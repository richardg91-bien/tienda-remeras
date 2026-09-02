/**
 * Prefetch del Design Studio: descarga el chunk lazy de /disenar
 * cuando el usuario hace hover/focus sobre un link hacia él.
 * El import se resuelve una sola vez (módulos se cachean), pero
 * guardamos la promesa para evitar trabajo redundante.
 */
let prefetchPromise = null;

export function prefetchStudio() {
  if (!prefetchPromise) {
    prefetchPromise = import("../pages/Disenar.jsx");
  }
  return prefetchPromise;
}
