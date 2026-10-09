class ConfigError extends Error { name = 'ConfigError'; }

function loadConfig(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new ConfigError('config is unreadable', { cause: err });
  }
}
try { loadConfig('{bad'); } catch (e) {
  console.log(`${e.name}: ${e.message}`);
  console.log('cause:', e.cause.name);
}
