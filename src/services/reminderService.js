// Reminder scheduling service
class ReminderService {
  constructor() {
    this.reminders = new Map();
    this.loadReminders();
  }

  loadReminders() {
    try {
      const stored = localStorage.getItem('calendar-reminders');
      if (stored) {
        const reminders = JSON.parse(stored);
        reminders.forEach(reminder => {
          this.scheduleReminder(reminder.event, reminder.minutesBefore, reminder.id);
        });
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  }

  saveReminders() {
    const reminders = Array.from(this.reminders.values());
    localStorage.setItem('calendar-reminders', JSON.stringify(reminders));
  }

  scheduleReminder(event, minutesBefore, reminderId = null) {
    const id = reminderId || `reminder_${event.id}_${Date.now()}`;

    // Cancel existing reminder if any
    this.cancelReminder(id);

    const eventStart = new Date(event.start);
    const reminderTime = new Date(eventStart.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();

    if (reminderTime <= now) {
      // Reminder time has passed, don't schedule
      return null;
    }

    const timeout = reminderTime - now;
    const timeoutId = setTimeout(() => {
      this.triggerReminder(event, minutesBefore);
      this.reminders.delete(id);
      this.saveReminders();
    }, timeout);

    this.reminders.set(id, {
      id,
      event,
      minutesBefore,
      timeoutId,
      scheduledFor: reminderTime
    });

    this.saveReminders();
    return id;
  }

  async triggerReminder(event, minutesBefore) {
    try {
      // Browser notification
      const { notificationService } = await import('./notificationService');
      await notificationService.sendEventReminder(event, minutesBefore);

      // ntfy.sh push notification for cross-device alerts
      const eventTime = new Date(event.start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      await fetch('https://ntfy.sh/cal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'cal',
          title: `⏰ ${event.title}`,
          message: `Starting in ${minutesBefore} minutes at ${eventTime}`,
          tags: ['calendar', 'reminder'],
          priority: minutesBefore <= 5 ? 5 : 3
        })
      }).catch(err => console.warn('ntfy.sh notification failed:', err));
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }

  cancelReminder(id) {
    const reminder = this.reminders.get(id);
    if (reminder) {
      clearTimeout(reminder.timeoutId);
      this.reminders.delete(id);
      this.saveReminders();
    }
  }

  cancelEventReminders(eventId) {
    const toCancel = [];
    this.reminders.forEach((reminder, id) => {
      if (reminder.event.id === eventId) {
        toCancel.push(id);
      }
    });
    toCancel.forEach(id => this.cancelReminder(id));
  }

  updateEventReminders(event) {
    // Cancel old reminders
    this.cancelEventReminders(event.id);

    // Schedule new reminder if set
    if (event.reminder) {
      this.scheduleReminder(event, parseInt(event.reminder));
    }
  }

  getAllReminders() {
    return Array.from(this.reminders.values());
  }
}

export const reminderService = new ReminderService();
