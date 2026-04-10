import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config.background';
import fs from 'fs';

export default defineConfig(async (env) => {
  const base = await (typeof baseConfig === 'function' ? baseConfig(env) : baseConfig);
  return mergeConfig(base, {
    plugins: [{
      name: 'bg-size-analyzer',
      generateBundle(_opts: any, bundle: Record<string, any>) {
        const stats: any[] = [];
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type !== 'chunk') continue;
          for (const [modId, modInfo] of Object.entries(chunk.modules || {})) {
            stats.push({
              chunk: fileName,
              module: modId,
              rendered: (modInfo as any).renderedLength || 0,
              original: (modInfo as any).originalLength || 0
            });
          }
        }
        fs.writeFileSync('./bg-analysis.json', JSON.stringify(stats));
        console.log(`[analyzer] ${stats.length} modules`);
      }
    }]
  });
});
