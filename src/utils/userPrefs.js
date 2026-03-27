/**
 * Utility to fetch user productivity preferences from local storage.
 * Synchronized with Settings.jsx storage keys.
 */
export const getUserPreferences = () => {
    try {
        const stored = localStorage.getItem('calai-priority-prefs');
        return stored ? JSON.parse(stored) : {
            peakEnergyTime: 'morning',
            energyDips: ['afternoon'],
            deepWorkDuration: 90,
            breakFrequency: 25,
            preferUninterrupted: true,
            morningFocus: 'deep_work',
            afternoonFocus: 'meetings',
            eveningFocus: 'light_tasks',
            categoryRanking: {
                work: 5,
                health: 4,
                personal: 3,
                learning: 3,
                social: 2
            }
        };
    } catch {
        return {
            peakEnergyTime: 'morning',
            morningFocus: 'deep_work',
            afternoonFocus: 'meetings',
            eveningFocus: 'light_tasks',
            preferUninterrupted: true
        };
    }
};
