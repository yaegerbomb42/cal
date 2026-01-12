class NotificationService {
  constructor() {
    this.ntfyTopic = 'cal';
    this.ntfyUrl = `https://ntfy.sh/${this.ntfyTopic}`;
  }

  async sendPhoneNotification(title, message, priority = 'default') {
    try {
      const response = await fetch(this.ntfyUrl, {
        method: 'POST',
        headers: {
          'Title': title,
          'Priority': priority,
          'Tags': 'calendar,event'
        },
        body: message
      });

      if (!response.ok) {
        throw new Error(`Notification failed: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending phone notification:', error);
      return false;
    }
  }

  async sendEventNotification(event) {
    const title = `📅 New Event: ${event.title}`;
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    const message = `${event.description || 'No description'}\n\n` +
      `⏰ ${startDate.toLocaleString()} - ${endDate.toLocaleString()}\n` +
      (event.location ? `📍 ${event.location}\n` : '') +
      `🏷️ ${event.category || 'general'}`;

    return await this.sendPhoneNotification(title, message, 'high');
  }

  async sendEventReminder(event, minutesBefore = 15) {
    const title = `⏰ Reminder: ${event.title}`;
    const startDate = new Date(event.start);
    
    const message = `Your event "${event.title}" starts in ${minutesBefore} minutes!\n\n` +
      `⏰ ${startDate.toLocaleString()}\n` +
      (event.location ? `📍 ${event.location}\n` : '');

    return await this.sendPhoneNotification(title, message, 'urgent');
  }
}

export const notificationService = new NotificationService();
