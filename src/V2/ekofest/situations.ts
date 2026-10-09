import rules from './model.publicodes.js';

/**
 * Paramètres acceptés par une règle, extraits de la signature `evaluate` émise
 * dans le JSDoc du module compilé.
 */
type RuleParameters<Rule> = Rule extends {
  evaluate: (...args: infer Args) => unknown;
}
  ? NonNullable<Args[0]>
  : never;

/**
 * Règle sur laquelle sont typées les situations. Le bilan total dépend de toutes
 * les autres règles : ses paramètres couvrent donc l'ensemble des entrées du
 * modèle, et une clé inconnue devient une erreur de compilation.
 */
export const referenceRule = 'resultats . bilan total';

export type Situation = Partial<
  RuleParameters<(typeof rules)[typeof referenceRule]>
>;

export interface NamedSituation {
  titre: string;
  description: string;
  situation: Situation;
}

const namedSituations: Record<string, NamedSituation> = {
  'grand festival urbain': {
    titre: 'Grand festival en centre-ville',
    description: 'Grand festival (100 000 personnes) en centre-ville',
    situation: {
      'informations . nombre de festivaliers': 100000,
      'informations . nombre de jours': 3,
      'transport . public . accessible en transports en commun': true,
      'infrastructures . scénographie . nombre petites scènes': 2,
      'infrastructures . scénographie . nombre grandes scènes': 4,
    },
  },
  'petit festival urbain': {
    titre: 'Petit festival en centre-ville',
    description: 'Petit festival (moins de 3 000 personnes) en centre-ville',
    situation: {
      'informations . nombre de festivaliers': 3000,
      'informations . nombre de jours': 3,
      'transport . public . accessible en transports en commun': true,
      'infrastructures . scénographie . nombre petites scènes': 1,
      'infrastructures . scénographie . nombre grandes scènes': 0,
    },
  },
  'grand festival rural': {
    titre: 'Grand festival en périphérie',
    description: 'Grand festival (250 000 personnes) en périphérie',
    situation: {
      'informations . nombre de festivaliers': 250000,
      'informations . nombre de jours': 4,
      'transport . public . accessible en transports en commun': false,
      'infrastructures . scénographie . nombre petites scènes': 4,
      'infrastructures . scénographie . nombre grandes scènes': 4,
    },
  },
  'petit festival rural': {
    titre: 'Petit festival en périphérie',
    description: 'Petit festival (moins de 3 000 personnes) en périphérie',
    situation: {
      'informations . nombre de festivaliers': 3000,
      'informations . nombre de jours': 3,
      'transport . public . accessible en transports en commun': false,
      'infrastructures . scénographie . nombre petites scènes': 0,
      'infrastructures . scénographie . nombre grandes scènes': 1,
    },
  },
};

export default Object.values(namedSituations).map(({ situation }) => situation);
