import c from 'ansi-colors';

/**
 * `ansi-colors` colore même hors TTY : on restreint les couleurs aux sorties
 * interactives pour ne pas polluer les logs (CI, redirection).
 */
c.enabled = Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined;

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

/**
 * Formatage des valeurs évaluées
 */

type Value = unknown;

const NOT_DEFINED = Symbol.for('not defined');
const NOT_APPLICABLE = Symbol.for('not applicable');

const numberFormat = new Intl.NumberFormat('fr-FR', {
  maximumSignificantDigits: 12,
});

export const isNumeric = (value: Value): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

export const isEmpty = (value: Value): boolean =>
  value === null || value === undefined || typeof value === 'symbol';

/**
 * Une unité absente est représentée par une chaîne vide (`serializeUnit` en V1)
 * ou par `"aucune"` (compilateur V2).
 */
export const isNoUnit = (unit?: string): boolean => !unit || unit === 'aucune';

export const formatUnit = (unit?: string): string =>
  isNoUnit(unit) ? 'aucune unité' : (unit as string);

export const formatNumber = (value: number): string =>
  Number.isFinite(value) ? numberFormat.format(value) : String(value);

export const formatValue = (value: Value, unit?: string): string => {
  let text: string;
  if (value === null) {
    text = 'non applicable';
  } else if (value === undefined) {
    text = 'non défini';
  } else if (typeof value === 'symbol') {
    text =
      value === NOT_DEFINED
        ? 'non défini'
        : value === NOT_APPLICABLE
          ? 'non applicable'
          : String(value);
  } else if (typeof value === 'number') {
    text = formatNumber(value);
  } else if (typeof value === 'boolean') {
    text = value ? 'oui' : 'non';
  } else {
    text = String(value);
  }

  // `unit` vaut `undefined` quand elle n'est pas connue (ex. entrée de
  // situation) : on n'affiche alors rien. Une unité explicitement absente est
  // affichée pour ne pas la confondre avec une unité réelle.
  if (typeof value === 'number' && unit !== undefined) {
    text += isNoUnit(unit) ? ` (${formatUnit(unit)})` : ` ${unit}`;
  }
  return text;
};

export const formatDelta = (v1: Value, v2: Value): string => {
  if (!isNumeric(v1) || !isNumeric(v2)) return '—';
  const absolute = v2 - v1;
  const sign = absolute > 0 ? '+' : '';
  if (v1 === 0) return `${sign}${formatNumber(absolute)}`;
  const percentage = (absolute / v1) * 100;
  return `${percentage > 0 ? '+' : ''}${formatNumber(percentage)} %`;
};

export const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const formatSituation = (situation: Record<string, unknown>): string =>
  Object.entries(situation)
    .map(([key, value]) => `    ${key} = ${formatValue(value)}`)
    .join('\n');

/** Largeur d'affichage approximative, codes ANSI exclus (un accent compte pour un caractère). */
const displayWidth = (text: string): number =>
  [...text.replace(/\u001b\[[0-9;]*m/g, '')].length;

const indent = (text: string): string =>
  text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

const renderTable = (headers: string[], rows: string[][]): string => {
  const widths = headers.map((header, column) =>
    Math.max(
      displayWidth(header),
      ...rows.map((row) => displayWidth(row[column])),
    ),
  );
  const renderRow = (cells: string[]): string =>
    cells
      .map(
        (cell, column) =>
          cell + ' '.repeat(Math.max(0, widths[column] - displayWidth(cell))),
      )
      .join('  ');
  return [
    c.bold(renderRow(headers)),
    widths.map((width) => '─'.repeat(width)).join('  '),
    ...rows.map(renderRow),
  ].join('\n');
};

/**
 * Rapports de comparaison
 */

export interface ComparedValue {
  value: Value;
  /** Unité sérialisée (`serializeUnit` en V1, `unit` de la règle en V2). */
  unit?: string;
}

export interface Divergence {
  rule: string;
  v1: ComparedValue;
  v2: ComparedValue;
  /** Au moins une des deux évaluations a échoué. */
  failed: boolean;
  /** Les valeurs diffèrent (hors échec d'évaluation). */
  valueMismatch: boolean;
  /** Les unités diffèrent, y compris « aucune » face à une unité réelle. */
  unitMismatch: boolean;
  /** Écart relatif : sert uniquement à trier les divergences. */
  score: number;
}

export interface SituationReport {
  index: number;
  situation: Record<string, unknown>;
  referenceRule: string;
  v1Reference: ComparedValue;
  v2Reference: ComparedValue;
  referenceMatches: boolean;
  divergences: Divergence[];
  comparedRulesCount: number;
}

export const printHeader = ({
  referenceRule,
  situationsCount,
  comparedRulesCount,
}: {
  referenceRule: string;
  situationsCount: number;
  comparedRulesCount: number;
}): void => {
  console.log(c.bold('\nComparaison Publicodes V1 ↔ V2'));
  console.log(`Règle de référence : ${c.bold(referenceRule)}`);
  console.log(
    `${situationsCount} situation(s), ${comparedRulesCount} règle(s) comparée(s) (valeur et unité)\n`,
  );
};

export const printSkippedSituation = (index: number, reason: string): void => {
  console.log(c.yellow(`Situation #${index} — ignorée (${reason})\n`));
};

/**
 * L'unité n'a de sens que si les deux moteurs ont produit une valeur : une
 * règle non applicable en V1 n'a pas d'unité à comparer.
 */
const formatUnitComparison = (divergence: Divergence): string => {
  if (
    divergence.failed ||
    isEmpty(divergence.v1.value) ||
    isEmpty(divergence.v2.value)
  ) {
    return c.dim('—');
  }
  return divergence.unitMismatch ? c.bold(c.red('≠')) : c.dim('=');
};

export const printSituationReport = (report: SituationReport): void => {
  const header = `Situation #${report.index}`;

  if (report.referenceMatches && report.divergences.length === 0) {
    console.log(c.green(`✓ ${header} — résultats identiques`));
    return;
  }

  console.log(
    c.red(
      `✗ ${header} — ${report.divergences.length} règle(s) divergente(s) sur ${report.comparedRulesCount}`,
    ),
  );
  console.log(
    `  ${c.bold(report.referenceRule)} : ${report.referenceMatches ? c.green('identique') : c.red('DIFFÉRENT')}`,
  );
  console.log(
    `    V1 : ${formatValue(report.v1Reference.value, report.v1Reference.unit)}`,
  );
  console.log(
    `    V2 : ${formatValue(report.v2Reference.value, report.v2Reference.unit)}`,
  );
  console.log('  Entrées :');
  console.log(formatSituation(report.situation));

  if (report.divergences.length > 0) {
    const valueDivergences = report.divergences.filter(
      (divergence) => divergence.failed || divergence.valueMismatch,
    );
    const unitOnlyDivergences = report.divergences.filter(
      (divergence) =>
        !divergence.failed &&
        !divergence.valueMismatch &&
        divergence.unitMismatch,
    );

    if (valueDivergences.length > 0) {
      const rows = [...valueDivergences]
        .sort((a, b) => b.score - a.score)
        .map((divergence) => [
          divergence.rule,
          formatValue(divergence.v1.value, divergence.v1.unit),
          formatValue(divergence.v2.value, divergence.v2.unit),
          formatUnitComparison(divergence),
          divergence.failed
            ? '—'
            : formatDelta(divergence.v1.value, divergence.v2.value),
        ]);
      console.log(
        indent(renderTable(['Règle', 'V1', 'V2', 'Unité', 'Écart'], rows)),
      );
    }

    if (unitOnlyDivergences.length > 0) {
      const rows = [...unitOnlyDivergences]
        .sort((a, b) => a.rule.localeCompare(b.rule))
        .map((divergence) => [
          divergence.rule,
          formatValue(divergence.v1.value),
          formatUnit(divergence.v1.unit),
          formatUnit(divergence.v2.unit),
        ]);
      console.log(
        indent(
          c.bold(
            `Unités divergentes (valeurs identiques) — ${unitOnlyDivergences.length} règle(s) :`,
          ),
        ),
      );
      console.log(
        indent(renderTable(['Règle', 'Valeur', 'Unité V1', 'Unité V2'], rows)),
      );
    }
  }
  console.log('');
};

export const printSummary = ({
  referenceRule,
  situationsCount,
  comparedRulesCount,
  divergentSituationsCount,
  totalDivergences,
}: {
  referenceRule: string;
  situationsCount: number;
  comparedRulesCount: number;
  divergentSituationsCount: number;
  totalDivergences: number;
}): void => {
  if (divergentSituationsCount === 0) {
    console.log(
      c.green(
        `✓ Les ${situationsCount} situations donnent des résultats identiques sur « ${referenceRule} » (${comparedRulesCount} règles comparées).`,
      ),
    );
    return;
  }
  console.log(
    c.red(
      `✗ ${divergentSituationsCount}/${situationsCount} situation(s) divergente(s), ${totalDivergences} écart(s) de règle détecté(s).`,
    ),
  );
};
