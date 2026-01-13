/* global google, gapi */

const CLIENT_ID = '749125970287-9tc6qk0j8qjm9g5rqmm3ha92co8tr054.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDsErhKwzgqPNltgPjwVhGWMvZyc8VCUjU';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

class GoogleCalendarService {
    constructor() {
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.accessToken = null;
        this.isAuthorized = false;
    }

    // Load the scripts dynamically
    loadScripts() {
        return new Promise((resolve, reject) => {
            // Load GAPI
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.onload = () => {
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            // apiKey: API_KEY, // Optional if we strictly use OAuth, but good for public data
                            discoveryDocs: [DISCOVERY_DOC],
                        });
                        this.gapiInited = true;
                        if (this.gisInited) resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
            };
            document.body.appendChild(gapiScript);

            // Load GIS
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.onload = () => {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (resp) => {
                        if (resp.error !== undefined) {
                            throw (resp);
                        }
                        this.accessToken = resp.access_token;
                        this.isAuthorized = true;
                        localStorage.setItem('gcal_access_token', resp.access_token);
                    },
                });

                // Auto-recover from localStorage
                const storedToken = localStorage.getItem('gcal_access_token');
                if (storedToken) {
                    this.accessToken = storedToken;
                    this.isAuthorized = true;
                }

                this.gisInited = true;
                if (this.gapiInited) resolve();
            };
            document.body.appendChild(gisScript);
        });
    }

    async initialize() {
        try {
            await this.loadScripts();
            return true;
        } catch (e) {
            console.error("Failed to init Google Calendar Service", e);
            return false;
        }
    }

    handleAuthClick() {
        if (!this.tokenClient) return;

        // Check if we have a stored token (simplified for demo)
        const storedToken = localStorage.getItem('gcal_access_token');
        if (storedToken) {
            // Verify validity? For now, assume if it exists we try to use it
            // Or better, just request a new one to be safe if 'requestAccessToken' is prompt-less
            // But for "Connect" button, we force a prompt usually
        }

        if (gapi.client.getToken() === null) {
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            this.tokenClient.requestAccessToken({ prompt: '' });
        }
    }

    async listUpcomingEvents() {
        if (!this.gapiInited) throw new Error("GAPI not initialized");

        // Ensure token is set for GAPI
        if (this.accessToken) {
            gapi.client.setToken({ access_token: this.accessToken });
        }

        try {
            const request = {
                'calendarId': 'primary',
                'timeMin': (new Date()).toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 30,
                'orderBy': 'startTime',
            };
            const response = await gapi.client.calendar.events.list(request);
            return response.result.items.map(item => ({
                id: item.id,
                title: item.summary,
                description: item.description,
                start: item.start.dateTime || item.start.date,
                end: item.end.dateTime || item.end.date,
                location: item.location,
                source: 'google', // Mark as google event
                gcalId: item.id
            }));
        } catch (err) {
            console.error("Error listing events", err);
            throw err;
        }
    }

    async addEvent(event) {
        if (!this.gapiInited) throw new Error("GAPI not initialized");

        const gcalEvent = {
            summary: event.title,
            location: event.location,
            description: event.description,
            start: {
                dateTime: new Date(event.start).toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
                dateTime: new Date(event.end).toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
        };

        try {
            const request = gapi.client.calendar.events.insert({
                'calendarId': 'primary',
                'resource': gcalEvent,
            });
            const response = await request;
            return response.result;
        } catch (err) {
            console.error("Error creating event", err);
            throw err;
        }
    }
}

export const googleCalendarService = new GoogleCalendarService();
