// Server-Sent Events helpers. The browser reads these over a POST fetch (never EventSource/GET,
// which a third-party page could trigger).
import { once } from 'node:events';

export function openSse(res) {
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
}

/** Write one event, honouring back-pressure. Resolves false if the client is gone. */
export async function sendEvent(res, event, data) {
  if (res.writableEnded || res.destroyed) return false;
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  if (res.write(frame)) return true;
  const ac = new AbortController();
  const onClose = () => ac.abort();
  res.once('close', onClose);
  try {
    await once(res, 'drain', { signal: ac.signal });
    return true;
  } catch {
    return false;
  } finally {
    res.off('close', onClose);
  }
}
