import type { Situation } from 'publicodes';
import type { RuleName } from './publicodes-build/index.js';

export interface NamedSituation {
  titre: string;
  description: string;
  situation: Situation<RuleName>;
}

const namedSituations: Record<string, NamedSituation> = {
  'streaming harry potter': {
    titre: 'Streaming Harry Potter',
    description: "Streaming de l'ensemble des films d'Harry Potter",
    situation: {
      'streaming . durée': 1176,
      'streaming . qualité': "'HD'",
      'streaming . appareil': "'TV'",
      'streaming . réseau': "'fixe'",
    },
  },
  'streaming game of thrones': {
    titre: 'Streaming Game of Thrones',
    description: "Streaming d'un épisode de Game of Thrones",
    situation: {
      'streaming . durée': 60,
      'streaming . qualité': "'HD'",
      'streaming . appareil': "'TV'",
      'streaming . réseau': "'fixe'",
    },
  },
  'streaming friends': {
    titre: 'Streaming Friends',
    description: "Streaming de l'intégrale de Friends",
    situation: {
      'streaming . durée': 5192,
      'streaming . qualité': "'HD'",
      'streaming . appareil': "'TV'",
      'streaming . réseau': "'fixe'",
    },
  },
};

export default Object.values(namedSituations).map(({ situation }) => situation);
