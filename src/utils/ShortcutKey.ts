type KeyEvent = (key: KeyboardEvent) => void;
const keyset = new Set<string>();
window.addEventListener('keydown', execute);
window.addEventListener('keyup', executeUp);
const eventsDown: Set<KeyEvent> = new Set<KeyEvent>();
const eventsUp: Set<KeyEvent> = new Set<KeyEvent>();
function registerKeyDown(func: (key: KeyboardEvent) => void) {
  eventsDown.add(func);
}
function unregisterKeyDown(func: (key: KeyboardEvent) => void) {
  eventsDown.delete(func);
}
function registerKeyUp(func: (key: KeyboardEvent) => void) {
  eventsUp.add(func);
}
function unregisterkeyUp(func: (key: KeyboardEvent) => void) {
  eventsUp.delete(func);
}
function execute(key: KeyboardEvent) {
  if (key.target instanceof HTMLInputElement) {
    return;
  }
  if (keyset.has(key.code)) {
    return;
  }
  keyset.add(key.code);
  eventsDown?.forEach((e) => e?.(key));
}
function executeUp(key: KeyboardEvent) {
  if (key.target instanceof HTMLInputElement) {
    return;
  }
  keyset.delete(key.code);
  eventsUp?.forEach((e) => e?.(key));
}
export { registerKeyDown, unregisterKeyDown, registerKeyUp, unregisterkeyUp };
