/**
 * Compare les résultats des modèles Publicodes V1 et V2 sur chaque situation.
 *
 * Les deux modèles doivent décrire le même modèle métier : une règle exposée
 * par le modèle V2 mais absente du modèle V1 interrompt le script, plutôt que
 * de produire un rapport partiel.
 *
 * Pour chaque situation, la règle de référence et l'ensemble des règles du
 * modèle sont évalués avec les deux moteurs : les valeurs (avec une tolérance
 * pour les arrondis flottants) et les unités doivent être identiques. En cas
 * d'écart, le détail des règles divergentes est affiché afin d'identifier
 * l'origine du problème.
 *
 * Seule la logique de comparaison vit ici : le formatage et le rendu console
 * sont délégués à `utils.ts`.
 *
 * Usage : node scripts/compareResults.ts
 */

import LegacyEngine, { serializeUnit } from 'publicodes';

import v1Rules from '../src/V1/ekofest/publicodes-build/publicodes-road-to-v2.model.json' with { type: 'json' };
import v1Situations from '../src/V1/ekofest/situations.ts';
import rules from '../src/V2/ekofest/model.publicodes.js';
import situations, {
  referenceRule,
  type Situation,
} from '../src/V2/ekofest/situations.ts';
import {
  type ComparedValue,
  type Divergence,
  type SituationReport,
  formatError,
  isEmpty,
  isNoUnit,
  isNumeric,
  printHeader,
  printSituationReport,
  printSkippedSituation,
  printSummary,
} from './utils.ts';

/**
 * Les types du modèle V2 (`Evaluated`, `Options`…) sont déclarés en JSDoc
 * `@private` dans le fichier généré et ne sont pas exportés par `publicodes`,
 * dont l'`EvaluatedNode` décrit la forme V1. On travaille donc directement avec
 * le type du module compilé.
 */
type RuleName = keyof typeof rules;

/** Tolérance relative pour absorber les erreurs d'arrondi flottant. */
const RELATIVE_TOLERANCE = 1e-9;

const v1RuleNames = new Set(Object.keys(v1Rules));
const comparedRules = Object.keys(rules) as RuleName[];

/** L'unité est absente des règles non numériques. */
const unitOf = (rule: RuleName): string | undefined => {
  const candidate: unknown = rules[rule];
  if (typeof candidate !== 'object' || candidate === null) return undefined;
  return 'unit' in candidate && typeof candidate.unit === 'string'
    ? candidate.unit
    : undefined;
};

/**
 * Les deux modèles décrivent le même modèle métier : une règle du modèle V2
 * absente du modèle V1 rend la comparaison caduque. On échoue donc
 * immédiatement, plutôt que de produire un rapport partiel.
 *
 * ⚠️ Le modèle V1 compilé contient aussi les règles privées et les dépendances
 * externes (`nosgestesclimat`), que le compilateur V2 n'exporte pas : la
 * relation attendue est une inclusion (V2 ⊆ V1), pas une égalité.
 */
const assertModelsAreComparable = (): void => {
  if (!(referenceRule in rules)) {
    throw new Error(
      `La règle de référence « ${referenceRule} » est absente du modèle V2.`,
    );
  }
  const missingInV1 = comparedRules.filter((rule) => !v1RuleNames.has(rule));
  if (missingInV1.length > 0) {
    throw new Error(
      `${missingInV1.length} règle(s) du modèle V2 absente(s) du modèle V1 :\n` +
        missingInV1.map((rule) => `  - ${rule}`).join('\n'),
    );
  }
};

/** Le moteur V1 confond « non applicable » et « non défini » (valeur `null`). */
const valuesAreEqual = (v1: unknown, v2: unknown): boolean => {
  if (v1 === v2) return true;
  if (isNumeric(v1) && isNumeric(v2)) {
    return (
      Math.abs(v1 - v2) <=
      RELATIVE_TOLERANCE * Math.max(1, Math.abs(v1), Math.abs(v2))
    );
  }
  return isEmpty(v1) && isEmpty(v2);
};

/**
 * Les deux moteurs expriment l'absence d'unité différemment (`""` en V1,
 * `"aucune"` en V2) : ces deux notations sont équivalentes. En revanche,
 * « aucune » face à une unité réelle est une divergence.
 */
const unitsAreEqual = (v1?: string, v2?: string): boolean =>
  isNoUnit(v1) && isNoUnit(v2) ? true : v1 === v2;

/** Écart relatif utilisé pour classer les divergences par importance. */
const divergenceScore = (v1: unknown, v2: unknown): number => {
  if (!isNumeric(v1) || !isNumeric(v2)) return Infinity;
  if (v1 === 0) return Math.abs(v2);
  return Math.abs((v2 - v1) / v1);
};

const errorValue = (error: unknown): ComparedValue => ({
  value: `⚠ ${formatError(error)}`,
});

const compareRule = (
  rule: RuleName,
  v1Engine: LegacyEngine,
  situation: Situation,
): Divergence | undefined => {
  let v1: ComparedValue;
  let v2: ComparedValue;
  let failed = false;

  try {
    const evaluated = v1Engine.evaluate(rule);
    v1 = {
      value: evaluated.nodeValue,
      unit: serializeUnit(evaluated.unit),
    };
  } catch (error) {
    v1 = errorValue(error);
    failed = true;
  }

  try {
    const evaluated = rules[rule].evaluate(situation);
    v2 = { value: evaluated.value, unit: unitOf(rule) };
  } catch (error) {
    v2 = errorValue(error);
    failed = true;
  }

  const valueMismatch = !failed && !valuesAreEqual(v1.value, v2.value);

  // Une unité n'est comparable que si les deux moteurs ont évalué une valeur.
  const unitMismatch =
    !failed &&
    !isEmpty(v1.value) &&
    !isEmpty(v2.value) &&
    !unitsAreEqual(v1.unit, v2.unit);

  if (failed || valueMismatch || unitMismatch) {
    return {
      rule,
      v1,
      v2,
      failed,
      valueMismatch,
      unitMismatch,
      score: divergenceScore(v1.value, v2.value),
    };
  }
  return undefined;
};

const compareSituation = (
  situation: Situation,
  v1Engine: LegacyEngine,
): SituationReport => {
  const v1Reference = v1Engine.evaluate(referenceRule);
  const v2Reference = rules[referenceRule].evaluate(situation);
  const v1ReferenceValue: ComparedValue = {
    value: v1Reference.nodeValue,
    unit: serializeUnit(v1Reference.unit),
  };
  const v2ReferenceValue: ComparedValue = {
    value: v2Reference.value,
    unit: unitOf(referenceRule),
  };

  const divergences = comparedRules
    .map((rule) => compareRule(rule, v1Engine, situation))
    .filter((divergence): divergence is Divergence => divergence !== undefined);

  return {
    index: 0,
    situation,
    referenceRule,
    v1Reference: v1ReferenceValue,
    v2Reference: v2ReferenceValue,
    referenceMatches:
      valuesAreEqual(v1ReferenceValue.value, v2ReferenceValue.value) &&
      unitsAreEqual(v1ReferenceValue.unit, v2ReferenceValue.unit),
    divergences,
    comparedRulesCount: comparedRules.length,
  };
};

assertModelsAreComparable();

printHeader({
  referenceRule,
  situationsCount: situations.length,
  comparedRulesCount: comparedRules.length,
});

let divergentSituationsCount = 0;
let totalDivergences = 0;

situations.forEach((situation, index) => {
  const situationNumber = index + 1;
  const v1Situation = v1Situations[index];

  if (!v1Situation) {
    printSkippedSituation(
      situationNumber,
      'pas de situation V1 correspondante',
    );
    return;
  }

  const v1Engine = new LegacyEngine(
    v1Rules as ConstructorParameters<typeof LegacyEngine>[0],
  );

  try {
    v1Engine.setSituation(v1Situation);
  } catch (error) {
    printSkippedSituation(
      situationNumber,
      `erreur V1 à l'initialisation : ${formatError(error)}`,
    );
    divergentSituationsCount += 1;
    return;
  }

  const report = compareSituation(situation, v1Engine);
  report.index = situationNumber;
  printSituationReport(report);

  if (!report.referenceMatches || report.divergences.length > 0) {
    divergentSituationsCount += 1;
    totalDivergences += report.divergences.length;
  }
});

printSummary({
  referenceRule,
  situationsCount: situations.length,
  comparedRulesCount: comparedRules.length,
  divergentSituationsCount,
  totalDivergences,
});

if (divergentSituationsCount > 0) {
  process.exitCode = 1;
}
