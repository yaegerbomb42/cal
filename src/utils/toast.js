// Toast notification system
class ToastService {
  constructor() {
    this.toasts = [];
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(message, type = 'info', options = {}) {
    // Handle legacy duration parameter or options object
    const duration = typeof options === 'number' ? options : (options.duration || (type === 'error' ? 5000 : 3000));
    const action = typeof options === 'object' ? options.action : null;

    const toast = {
      id: Date.now() + Math.random(),
      message,
      type,
      duration,
      action
    };
    
    this.toasts.push(toast);
    this.listeners.forEach(listener => listener([...this.toasts]));
    
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }
    
    return toast.id;
  }

  success(message, options = 1800) {
    return this.notify(message, 'success', options);
  }

  error(message, options = 5000) {
    return this.notify(message, 'error', options);
  }

  warning(message, options = 2500) {
    return this.notify(message, 'warning', options);
  }

  info(message, options = 1800) {
    return this.notify(message, 'info', options);
  }

  remove(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  clear() {
    this.toasts = [];
    this.listeners.forEach(listener => listener([]));
  }
}

export const toastService = new ToastService();
