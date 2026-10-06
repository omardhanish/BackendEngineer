// BackendEngineer — a living book on localhost. `npm start` → http://localhost:4000
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
    const m = await ctx.content.manifest();
    console.log(`\n  ${bold('BackendEngineer')} ${dim('— a living book')}`);
    console.log(`  → ${bold(`http://localhost:${config.port}`)}`);
    console.log(dim(`  ${m.topics.length} pages (${m.authored} written) · data in ${config.dataDir}\n`));
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
