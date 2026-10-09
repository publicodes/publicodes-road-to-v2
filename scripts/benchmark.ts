import { run, bench, summary, do_not_optimize, group } from 'mitata';

import LegacyEngine from 'publicodes';

// Test data imports
import legacyRules from '../src/V1/ekofest/publicodes-build/publicodes-road-to-v2.model.json' with { type: 'json' };
import legacySituations from '../src/V1/ekofest/situations.ts';
import rules from '../src/V2/ekofest/model.publicodes.js';
import situations, { referenceRule } from '../src/V2/ekofest/situations.ts';
import { evaluateOptions } from './utils.ts';

/** Première situation de chaque fichier, pour les benchs mono-situation. */
const legacyReferenceSituation = legacySituations[0];
const referenceSituation = situations[0];

summary(() => {
  group('Evaluation without cache', () => {
    const legacyEngine = new LegacyEngine(legacyRules);
    legacyEngine.setSituation(legacyReferenceSituation);

    bench('Publicodes 1', () => {
      legacyEngine.resetCache();
      do_not_optimize(legacyEngine.evaluate(referenceRule).nodeValue);
    });

    bench('Publicodes 2', () => {
      do_not_optimize(rules[referenceRule].evaluate(referenceSituation));
    });
  });

  group('Multiple rules evaluated first eval', () => {
    const legacyEngine = new LegacyEngine(legacyRules);

    bench('Publicodes 1', () => {
      legacyEngine.setSituation(legacyReferenceSituation);
      do_not_optimize(legacyEngine.evaluate(referenceRule).nodeValue);
    });

    bench('Publicodes 2 (with cache)', () => {
      const newContexte = Object.assign({}, referenceSituation);

      do_not_optimize(
        rules[referenceRule].evaluate(
          newContexte,
          evaluateOptions({ cache: true }),
        ),
      );
    });

    bench('Publicodes 2 (without cache)', () => {
      const newContexte = Object.assign({}, referenceSituation);
      do_not_optimize(rules[referenceRule].evaluate(newContexte));
    });
  });

  group('Multiple engine comparison', () => {
    const legacyEngine = new LegacyEngine(legacyRules);

    bench('Publicodes 1', () => {
      legacySituations.forEach((situation) => {
        const engine = legacyEngine.shallowCopy();
        engine.setSituation(situation);
        do_not_optimize(engine.evaluate(referenceRule).nodeValue);
      });
    });

    bench('Publicodes 2 (with cache)', () => {
      situations.forEach((situation) =>
        do_not_optimize(
          rules[referenceRule].evaluate(
            Object.assign({}, situation),
            evaluateOptions({ cache: true }),
          ),
        ),
      );
    });

    bench('Publicodes 2 (without cache)', () => {
      situations.forEach((situation) =>
        do_not_optimize(
          rules[referenceRule].evaluate(Object.assign({}, situation)),
        ),
      );
    });
  });
});

await run({
  format: 'mitata',
  throw: true,
});
