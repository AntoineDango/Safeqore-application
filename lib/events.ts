type Listener = (payload?: any) => void;

const bus: Record<string, Set<Listener>> = {};
const lastPayload: Record<string, any> = {};

export function on(event: string, cb: Listener) {
  if (!bus[event]) bus[event] = new Set();
  bus[event].add(cb);
  return () => off(event, cb);
}

export function off(event: string, cb: Listener) {
  bus[event]?.delete(cb);
}

export function emit(event: string, payload?: any) {
  lastPayload[event] = payload;
  bus[event]?.forEach((cb) => {
    try { cb(payload); } catch {}
  });
}

export function last(event: string, consume = true) {
  const p = lastPayload[event];
  if (consume) delete lastPayload[event];
  return p;
}
