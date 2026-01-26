export const aiEventEmitter = (() => {
  const target = new EventTarget();

  return {
    on(eventName, handler) {
      target.addEventListener(eventName, handler);
      return () => target.removeEventListener(eventName, handler);
    },
    emit(eventName, detail) {
      target.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  };
})();
