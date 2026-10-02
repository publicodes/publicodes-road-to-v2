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
