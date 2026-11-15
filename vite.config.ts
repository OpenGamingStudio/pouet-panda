/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Écrit dist/sw.js : version du cache = empreinte du contenu du build.
function serviceWorker(): Plugin {
  let outDir = 'dist';
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  return {
    name: 'pouet-panda-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files = walk(outDir).map((f) => relative(outDir, f)).filter((f) => f !== 'sw.js' && f !== 'robots.txt').sort();
      const h = createHash('sha256');
      for (const f of files) h.update(f).update(readFileSync(join(outDir, f)));
      const sw = readFileSync('sw-template.js', 'utf8')
        .replace('@@VERSION@@', h.digest('hex').slice(0, 10));
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), serviceWorker()],
  base: './',
  build: { outDir: 'dist', target: 'es2020' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
