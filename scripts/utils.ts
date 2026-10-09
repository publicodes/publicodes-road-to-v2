/**
 * Options d'évaluation acceptées par les `evaluate` générés par le compilateur
 * V2 (`{ cache: true }`, `{ trace: true }`…).
 *
 * ⚠️ Contournement d'un bug du compilateur : dans le JSDoc émis, le paramètre
 * `options` est annoté `{Options}` — un objet ayant une propriété `Options` —
 * au lieu du typedef `Options` pourtant bien déclaré. Le paramètre est donc
 * inutilisable tel quel ; ce helper rétablit un typage correct pour l'appelant.
 */
export const evaluateOptions = (options: {
  cache?: boolean;
  trace?: boolean;
}): never => options as never;
