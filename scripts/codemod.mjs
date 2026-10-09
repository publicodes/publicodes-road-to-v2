#!/usr/bin/env node
/**
 * Wrapper autour de `@publicodes/codemod`.
 *
 * Deux raisons d'exister :
 *
 * 1. Le package déclare `"bin": "./bin/update-v2.js"` alors que le fichier
 *    réellement livré est `bin/codemod-v2.js` : aucun binaire n'est lié dans
 *    `node_modules/.bin`, d'où le `@publicodes/codemod: No such file or
 *    directory` quand on l'appelle par son nom.
 *
 * 2. Le codemod n'accepte que des *fichiers* : il fait `fs.readFile` sur chaque
 *    argument, sans récursion. Lui passer un dossier échoue en `ENOENT`.
 *
 * Ce wrapper parcourt donc récursivement les dossiers reçus, ne retient que les
 * `.publicodes`, et délègue au codemod. Les noms de fichiers contenant des
 * espaces sont gérés (chaque chemin est passé comme argument distinct).
 *
 * Usage :
 *   node scripts/codemod.mjs <chemin>...
 *   pnpm codemod src/V2/ekofest
 *
 * ⚠️ Le codemod modifie les fichiers **sur place**, sans sauvegarde.
 */
import { spawnSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import process from "node:process";

/** Nombre de fichiers passés par invocation (limite ARG_MAX). */
const BATCH_SIZE = 200;

const require = createRequire(import.meta.url);

function locateCodemod() {
  const packageJson = require.resolve("@publicodes/codemod/package.json");
  return join(dirname(packageJson), "bin", "codemod-v2.js");
}

/** Parcourt un dossier récursivement et retourne les `.publicodes` trouvés. */
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (entry.isFile() && extname(entry.name) === ".publicodes") {
      files.push(path);
    }
  }
  return files;
}

async function collect(targets) {
  const files = [];
  for (const target of targets) {
    const path = resolve(target);
    let info;
    try {
      info = await stat(path);
    } catch {
      console.error(`codemod: chemin introuvable: ${target}`);
      process.exitCode = 1;
      continue;
    }
    if (info.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (info.isFile()) {
      files.push(path);
    }
  }
  return files;
}

const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error("Usage: pnpm codemod <chemin>...");
  console.error(
    "  <chemin> : un dossier (parcouru récursivement) ou des fichiers .publicodes",
  );
  process.exit(2);
}

const codemod = locateCodemod();
const files = await collect(targets);

if (files.length === 0) {
  console.error("codemod: aucun fichier .publicodes trouvé");
  process.exit(1);
}

console.log(`codemod: ${files.length} fichier(s) à traiter`);

let failed = false;
for (let i = 0; i < files.length; i += BATCH_SIZE) {
  const result = spawnSync(
    process.execPath,
    [codemod, ...files.slice(i, i + BATCH_SIZE)],
    {
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    failed = true;
  }
}

if (!failed) {
  console.log(
    "codemod: terminé. Pensez à mettre à jour la version de publicodes dans package.json (non fait automatiquement).",
  );
}

process.exit(failed ? 1 : 0);
