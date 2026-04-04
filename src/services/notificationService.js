import { logger } from '../utils/logger';

class NotificationService {
  constructor() {
    this.loadTopic(); // Load custom topic from localStorage
  }

  loadTopic() {
    const stored = localStorage.getItem('calai-ntfy-room');
    if (stored) {
      this.ntfyTopic = stored;
    } else {
      this.ntfyTopic = 'cal'; // Default topic
    }
    this.ntfyUrl = `https://ntfy.sh/${this.ntfyTopic}`;
  }

  setTopic(topic) {
    this.ntfyTopic = topic;
    this.ntfyUrl = `https://ntfy.sh/${this.ntfyTopic}`;
    localStorage.setItem('calai-ntfy-room', topic);
  }

  async sendPhoneNotification(title, message, priority = 'default') {
    try {
      const response = await fetch(this.ntfyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Title': title,
          'Priority': priority,
          'Tags': 'calendar,event'
        },
        body: message
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notification failed: ${response.statusText} - ${errorText}`);
      }

      logger.info('Phone notification sent successfully', { title });
      return true;
    } catch (error) {
      logger.error('Error sending phone notification', { error: error.message });
      return false;
    }
  }

  // --- Email & SMS Expansion ---

  /**
   * Sends an email via EmailJS (client-side)
   * Required parameters should be in localStorage or passed in
   */
  async sendEmailNotification(to, subject, body, config = {}) {
    try {
      // Configuration from localStorage
      const serviceId = config.serviceId || localStorage.getItem('calai-email-service-id');
      const templateId = config.templateId || localStorage.getItem('calai-email-template-id');
      const publicKey = config.publicKey || localStorage.getItem('calai-email-public-key');

      if (!serviceId || !templateId || !publicKey) {
        logger.warn('EmailJS config missing, skipping email notification');
        return false;
      }

      // Dynamically import EmailJS to avoid bundling issues if not used
      const emailjs = await import('@emailjs/browser');
      
      const response = await emailjs.send(serviceId, templateId, {
        to_email: to,
        subject: subject,
        message: body,
      }, publicKey);

      logger.info('Email sent successfully', { status: response.status });
      return true;
    } catch (error) {
      logger.error('Error sending email notification', { error: error.message });
      return false;
    }
  }

  /**
   * Sends an SMS via Email-to-SMS Gateway
   */
  async sendSMSNotification(phone, carrier, message, config = {}) {
    const gateways = {
      'att': '@txt.att.net',
      'verizon': '@vtext.com',
      'tmobile': '@tmomail.net',
      'sprint': '@messaging.sprintpcs.com',
      'googlefi': '@msg.fi.google.com',
      'xfinity': '@vtext.com', // Xfinity Mobile uses Verizon Network
      'virgin': '@vmobl.com'
    };

    const gateway = gateways[carrier.toLowerCase()];
    if (!gateway) {
      logger.error('Unsupported carrier for SMS gateway', { carrier });
      return false;
    }

    const gatewayEmail = `${phone.replace(/\D/g, '')}${gateway}`;
    logger.info(`Routing SMS through gateway: ${gatewayEmail}`);

    return await this.sendEmailNotification(
      gatewayEmail, 
      'CalAI Alert', 
      message, 
      config
    );
  }

  async sendEventNotification(event) {
    const title = `📅 New Event: ${event.title}`;
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    const message = `${event.description || 'No description'}\n\n` +
      `⏰ ${startDate.toLocaleString()} - ${endDate.toLocaleString()}\n` +
      (event.location ? `📍 ${event.location}\n` : '') +
      `🏷️ ${event.category || 'general'}`;

    // Parallel dispatch
    return Promise.all([
      this.sendPhoneNotification(title, message, 'high'),
      this.dispatchEventToOtherChannels(event, title, message)
    ]);
  }

  async sendEventReminder(event, minutesBefore = 15) {
    const title = `⏰ Reminder: ${event.title}`;
    const startDate = new Date(event.start);

    const message = `Your event "${event.title}" starts in ${minutesBefore} minutes!\n\n` +
      `⏰ ${startDate.toLocaleString()}\n` +
      (event.location ? `📍 ${event.location}\n` : '');

    return Promise.all([
      this.sendPhoneNotification(title, message, 'urgent'),
      this.dispatchEventToOtherChannels(event, title, message, true)
    ]);
  }

  /**
   * Internal helper to dispatch based on user set preferences
   */
  /**
   * Sends an iMessage via the Local Oracle Bridge
   */
  async sendOracleIMessage(to, message, config = {}) {
    try {
      const bridgeUrl = config.bridgeUrl || localStorage.getItem('calai-notifier-url') || 'http://localhost:3004';
      
      const response = await fetch(`${bridgeUrl}/v1/notifications/imessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message })
      });

      if (!response.ok) throw new Error('Oracle Bridge request failed');
      
      logger.info('iMessage sent via Oracle Bridge', { to });
      return { status: 'success', platform: 'imessage' };
    } catch (error) {
      logger.error('Error sending iMessage via Oracle', { error: error.message });
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Sends a Google Voice SMS via the Oracle Bridge
   */
  async sendOracleVoiceMessage(to, message, config = {}) {
    try {
      const bridgeUrl = config.bridgeUrl || localStorage.getItem('calai-notifier-url') || 'http://localhost:3004';
      
      const response = await fetch(`${bridgeUrl}/v1/notifications/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Voice Bridge request failed');
      
      logger.info('Google Voice SMS sent via Oracle Bridge', { to });
      return { status: 'success', platform: 'google_voice' };
    } catch (error) {
      logger.error('Error sending Google Voice via Oracle', { error: error.message });
      return { status: 'error', message: error.message };
    }
  }

  async checkGoogleVoiceStatus(config = {}) {
    try {
      const bridgeUrl = config.bridgeUrl || localStorage.getItem('calai-notifier-url') || 'http://localhost:3004';
      const response = await fetch(`${bridgeUrl}/v1/notifications/voice/status`);
      return await response.json();
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  async initGoogleVoiceSession(config = {}) {
    try {
      const bridgeUrl = config.bridgeUrl || localStorage.getItem('calai-notifier-url') || 'http://localhost:3004';
      const response = await fetch(`${bridgeUrl}/v1/notifications/voice/init`, { method: 'POST' });
      return await response.json();
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  async dispatchEventToOtherChannels(event, title, message) {
    const prefs = JSON.parse(localStorage.getItem('calai-notification-prefs') || '{}');
    const config = {
      serviceId: localStorage.getItem('calai-email-service-id'),
      templateId: localStorage.getItem('calai-email-template-id'),
      publicKey: localStorage.getItem('calai-email-public-key'),
      bridgeUrl: localStorage.getItem('calai-notifier-url') || 'http://localhost:3004'
    };

    const promises = [];

    if (prefs.emailEnabled && prefs.userEmail) {
      promises.push(this.sendEmailNotification(prefs.userEmail, title, message, config));
    }

    if (prefs.smsEnabled && prefs.userPhone && prefs.userCarrier) {
      promises.push(this.sendSMSNotification(prefs.userPhone, prefs.userCarrier, message, config));
    }

    if (prefs.imessageEnabled && prefs.userIMessage) {
      promises.push(this.sendOracleIMessage(prefs.userIMessage, message, config));
    }

    if (prefs.googlevoiceEnabled && prefs.userVoiceNumber) {
      promises.push(this.sendOracleVoiceMessage(prefs.userVoiceNumber, message, config));
    }

    return Promise.all(promises);
  }
}

export const notificationService = new NotificationService();
