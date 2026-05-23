interface Pendo {
  track(eventName: string, properties?: Record<string, string | number | boolean>): void;
}

interface Window {
  pendo?: Pendo;
}
