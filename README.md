# publicodes-road-to-v2

Environment to test model across publicodes V1 and V2

## Compiling

Deux compilateurs coexistent dans ce dépôt :

| Commande              | Compilateur                       | Core            | Sortie par défaut     |
| --------------------- | --------------------------------- | --------------- | --------------------- |
| `pnpm run compile`    | `@publicodes/tools` (1.10.2)      | `publicodes` V2 | `publicodes-build/`   |
| `pnpm run compile:v2` | `@publicodes/cli` (2.0.0-alpha.0) | `publicodes` V2 | `model.publicodes.js` |

### `pnpm run compile:v2`

Invoque directement le binaire `publicodes2` exposé par `@publicodes/cli` (le répertoire source est requis, il n'y a pas de valeur par défaut).

Interface du compilateur V2 (cf. `packages/compiler/bin/cmd_compile.ml`) :

| Argument                    | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `DIR` (positionnel, requis) | répertoire contenant les `.publicodes` (`-` pour stdin) |
| `-o`, `--output-file FILE`  | fichier de sortie (déf. `model.publicodes.<ext>`)       |
| `-t`, `--output-type TYPE`  | `js` (déf.) \| `debug_eval_tree` \| `json_doc`          |
| `--default-to-public`       | exporte toutes les règles comme publiques               |
| `--without-trace`           | désactive la génération de la trace d'évaluation        |

> Seules les règles marquées `public: oui` (ou toutes avec
> `--default-to-public`) apparaissent dans `export default rules`.

## Migrer un modèle vers la V2 (`codemod`)

```sh
pnpm run codemod src/V2/ekofest      # parcourt le dossier récursivement
pnpm run codemod src/V2/ekofest/*.publicodes   # ou des fichiers précis
```

Transformations appliquées sur place (fichiers `.publicodes` uniquement) :

| Transformation                | Effet                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `renameFormuleToValeur`       | `formule:` → `valeur:`                                                         |
| `moveNonAuthorizedKeysToMeta` | clés non reconnues (`question:`, `titre:`…) → `meta:` (récursif, gère `avec:`) |
| `removeDoubleQuotes`          | `'xxx'` / `"yyy"` → `xxx`                                                      |

⚠️ Le codemod écrit **sur place, sans sauvegarde**. Commitez avant.

Ce qu'il ne fait **pas** (d'après son README) :

- la version des packages dans `package.json` (à mettre à jour à la main) ;
- la syntaxe exotique de `variations` (à migrer **avant**) ;
- le changement d'ordre de priorité des `remplacement` ;
- les appels `evaluate` avec expression publicodes dans le code JS.

### Pourquoi un wrapper ?

`scripts/codemod.mjs` existe parce que le package publié est cassé sur deux points :

1. Il déclare `"bin": "./bin/update-v2.js"` alors que le fichier livré est
   `bin/codemod-v2.js` → aucun binaire lié dans `node_modules/.bin`, d'où
   `@publicodes/codemod: No such file or directory`.
2. Il n'accepte que des **fichiers** (aucune récursion) : lui passer un dossier
   échoue en `ENOENT`.
