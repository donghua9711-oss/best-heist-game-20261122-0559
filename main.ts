// The Night Vault's hand-in program (Node 22, standard library only). The game is this
// repository's game/ folder — plain static files a desktop browser runs offline — and this
// program hands it in: it copies game/ and screenshots/ from beside this file to the output
// folder and writes dossier.json there, the summary the judge reads, built by the vendored
// make.fun library in vendor/makefun-game.ts (the kit's copy, unchanged).
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier is written with the scorer's own caps, so what is handed in is what the gate
// rebuilds and compares byte for byte: at most 4 screenshots of at most 256 KiB each, at most
// 993 files and 48 MiB under game/, no path under game/ over 1,000 bytes, and the source text
// the judge's outline is drawn from capped at 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
