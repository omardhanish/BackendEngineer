// A library of living books on localhost. `npm start` → http://localhost:4000
import { config } from './lib/env.js';
import { createContext, createApp } from './app.js';

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

async function main() {
  const ctx = await createContext(config);
  const app = createApp(ctx);
  const server = app.listen(config.port, config.host);

  server.once('error', async (e) => {
    if (e.code === 'EADDRINUSE') console.error(`\nPort ${config.port} is already in use. Stop the other process or set PORT in .env.\n`);
    else console.error(e);
    await ctx.store.close().catch(() => {});
    process.exit(1);
  });

  server.once('listening', async () => {
    const cards = await ctx.library.list();
    console.log(`\n  ${bold('Living library')} ${dim('— books you can read, run and ask')}`);
    console.log(`  → ${bold(`http://localhost:${config.port}`)}`);
    for (const c of cards) console.log(dim(`  · ${c.title}: ${c.pages} pages (${c.authored} written)`));
    for (const [slug, why] of ctx.library.problems) console.warn(`  \x1b[33m! book "${slug}" is not shown:\x1b[0m ${why}`);
    console.log(dim(`  data in ${config.dataDir}\n`));
    // Verify the tutor in the background; the book itself works without it.
    const check = await ctx.deepseek.checkModels();
    ctx.health.modelOk = check.ok;
    ctx.health.modelError = check.error;
    ctx.health.models = check.models;
    if (check.ok) console.log(dim(`  tutor ready: ${config.deepseek.model}\n`));
    else console.warn(`  \x1b[33m! tutor unavailable:\x1b[0m ${check.error}\n    The book still works; fix DEEPSEEK_API_KEY / DEEPSEEK_MODEL in .env and restart.\n`);
  });

  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    console.log(dim(`\n  ${signal}: finishing up…`));
    ctx.shuttingDown = true;
    for (const c of ctx.controllers) c.abort(new Error('server shutting down'));
    server.close();
    const force = setTimeout(() => server.closeAllConnections(), 2000);
    force.unref();
    await new Promise((r) => setTimeout(r, 150));
    await ctx.store.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((e) => {
  console.error(`\n${e.message}\n`);
  process.exit(1);
});
