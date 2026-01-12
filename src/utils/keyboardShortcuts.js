// Keyboard shortcuts handler
const shortcuts = new Map();

export const registerShortcut = (key, callback, options = {}) => {
  const { ctrl = false, shift = false, alt = false } = options;
  const id = `${key}-${ctrl}-${shift}-${alt}`;
  
  shortcuts.set(id, {
    key: key.toLowerCase(),
    ctrl,
    shift,
    alt,
    callback
  });

  return () => {
    shortcuts.delete(id);
  };
};

export const handleKeyboardEvent = (event) => {
  const key = event.key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;
  const shift = event.shiftKey;
  const alt = event.altKey;

  // Don't trigger shortcuts when typing in inputs
  if (
    event.target.tagName === 'INPUT' ||
    event.target.tagName === 'TEXTAREA' ||
    event.target.isContentEditable
  ) {
    return;
  }

  const id = `${key}-${ctrl}-${shift}-${alt}`;
  const shortcut = shortcuts.get(id);

  if (shortcut) {
    event.preventDefault();
    shortcut.callback(event);
    return true;
  }

  return false;
};

// Initialize global keyboard listener
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeyboardEvent);
}
