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
export const referenceRule = 'streaming';

export type Situation = Partial<
  RuleParameters<(typeof rules)[typeof referenceRule]>
>;

export interface NamedSituation {
  titre: string;
  description: string;
  situation: Situation;
}

const namedSituations: Record<string, NamedSituation> = {
  'streaming harry potter': {
    titre: 'Streaming Harry Potter',
    description: "Streaming de l'ensemble des films d'Harry Potter",
    situation: {
      'streaming . durée': 1176,
      'streaming . qualité': 'HD',
      'streaming . appareil': 'TV',
      'streaming . réseau': 'fixe',
    },
  },
  'streaming game of thrones': {
    titre: 'Streaming Game of Thrones',
    description: "Streaming d'un épisode de Game of Thrones",
    situation: {
      'streaming . durée': 60,
      'streaming . qualité': 'HD',
      'streaming . appareil': 'TV',
      'streaming . réseau': 'fixe',
    },
  },
  'streaming friends': {
    titre: 'Streaming Friends',
    description: "Streaming de l'intégrale de Friends",
    situation: {
      'streaming . durée': 5192,
      'streaming . qualité': 'HD',
      'streaming . appareil': 'TV',
      'streaming . réseau': 'fixe',
    },
  },
};

export default Object.values(namedSituations).map(({ situation }) => situation);
