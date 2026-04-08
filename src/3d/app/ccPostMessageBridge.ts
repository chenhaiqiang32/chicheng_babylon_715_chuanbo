export const CC_APP_SOURCE = 'cc-app' as const;
export const CC_3D_SOURCE = 'cc-3d' as const;

type AnyRecord = Record<string, unknown>;

export function postToParent(message: AnyRecord, targetOrigin: string = '*') {
  if (window.parent !== window) {
    window.parent.postMessage(message, targetOrigin);
  }
}

export function setupWindowMessageListener(
  handler: (event: MessageEvent, data: unknown) => void,
): () => void {
  const onMessage = (event: MessageEvent) => {
    handler(event, event.data);
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}

export function isObjectLike(v: unknown): v is AnyRecord {
  return !!v && typeof v === 'object';
}

