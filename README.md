# CalAI - AI-Powered Calendar Application

A sophisticated, modern calendar application built with React 18, featuring a beautiful glassmorphism design and AI-powered assistance using Google's Gemini API.

![CalAI Screenshot](https://via.placeholder.com/800x400/667eea/ffffff?text=CalAI+-+AI-Powered+Calendar)

## ✨ Features

### 🎨 Modern Design
- **Glassmorphism UI** - Beautiful transparent glass-like components with backdrop blur effects
- **Dark/Light Theme** - Seamless theme switching with system preference detection
- **Responsive Design** - Mobile-first approach with smooth animations
- **Framer Motion** - Smooth, performant animations throughout the application

### 📅 Calendar Views
- **Month View** - Traditional calendar grid with event previews
- **Week View** - Detailed weekly schedule with hour-by-hour layout
- **Day View** - Focused daily agenda with full event details
- **Smooth Transitions** - Animated view switching for better UX

### 🤖 AI-Powered Features
- **Natural Language Event Creation** - "Schedule a meeting tomorrow at 2 PM"
- **Smart Conflict Detection** - AI suggests alternative times for conflicting events
- **Contextual Chat Assistant** - Ask questions about your schedule
- **Intelligent Scheduling** - AI understands time, dates, and context

### 🛠 Core Functionality
- **Drag & Drop** - Reschedule events by dragging (planned feature)
- **Event Management** - Create, edit, delete events with rich details
- **Local Storage** - All data stored locally with export/import capabilities
- **Categories & Colors** - Organize events with custom categories and colors

### ⚙️ Settings & Data
- **API Key Management** - Secure Gemini API key configuration
- **Data Export/Import** - Backup and restore your calendar data
- **Statistics Dashboard** - Track your calendar usage
- **Storage Management** - Clear data and manage local storage

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key (optional, for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cal.git
   cd cal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

### Building for Production

```bash
npm run build
npm run preview
```

### Deployment

**Quick Deploy to Vercel:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yaegerbomb42/cal)

**Manual Deployment:**
```bash
# Deploy to preview
npm run deploy:preview

# Deploy to production  
npm run deploy
```

For detailed deployment instructions, see [DEPLOY.md](DEPLOY.md).

## 🔧 Configuration

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it in CalAI Settings

### Environment Setup

For development, you can create a `.env.local` file:

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

## 🎯 Usage Guide

### Creating Events

**Manual Creation:**
1. Click on any date/time slot
2. Fill in event details
3. Choose category and color
4. Save the event

**AI-Powered Creation:**
1. Open AI Chat (🤖 button)
2. Type naturally: "Schedule dinner with John tomorrow at 7 PM"
3. AI will parse and create the event
4. Confirm or modify as needed

### AI Assistant Commands

- **Schedule events**: "Book a dentist appointment next Friday at 2 PM"
- **Check schedule**: "What do I have tomorrow?"
- **Find conflicts**: "Do I have any conflicts this afternoon?"
- **Get suggestions**: "Suggest some time for a team meeting this week"

### Keyboard Shortcuts

- `T` - Go to today
- `←/→` - Navigate between time periods
- `1/2/3` - Switch to Day/Week/Month view
- `N` - Create new event
- `?` - Open AI chat

## 🏗 Architecture

### Tech Stack
- **Frontend**: React 18, Vite
- **Styling**: CSS3 with CSS Variables, Glassmorphism effects
- **Animations**: Framer Motion
- **AI**: Google Gemini API
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **State Management**: React Context API

### Project Structure
```
src/
├── components/
│   ├── Header/           # Navigation and controls
│   ├── Calendar/         # Calendar views (Day/Week/Month)
│   ├── Events/           # Event management modals
│   ├── AI/              # AI chat interface
│   └── Settings/        # Configuration panels
├── contexts/            # React Context providers
├── services/            # External API services
├── utils/              # Helper functions and utilities
└── styles/             # Global styles and themes
```

### Key Components

- **ThemeProvider**: Manages dark/light theme state
- **EventsProvider**: Handles event CRUD operations and local storage
- **CalendarProvider**: Manages calendar view state and navigation
- **GeminiService**: Handles AI API calls and natural language processing

## 🎨 Customization

### Themes

The application supports custom themes through CSS variables:

```css
:root {
  --bg-primary: your-gradient;
  --glass-bg: rgba(255, 255, 255, 0.1);
  --accent: #6366f1;
  /* ... more variables */
}
```

### Event Categories

Add new categories in `utils/helpers.js`:

```javascript
const getEventColor = (category) => {
  const colors = {
    work: '#3b82f6',
    personal: '#10b981',
    // Add your custom categories
    study: '#8b5cf6',
    fitness: '#f59e0b'
  };
  return colors[category] || colors.default;
};
```

## 🔒 Privacy & Security

- **Local Storage**: All calendar data is stored locally in your browser
- **API Key Security**: Gemini API keys are stored locally and never transmitted to our servers
- **No Tracking**: No analytics or tracking scripts
- **Offline Capable**: Core calendar functions work without internet

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Reporting Issues

Please use the [GitHub Issues](https://github.com/yourusername/cal/issues) page to report bugs or request features.

## 📱 Mobile Support

CalAI is fully responsive and optimized for mobile devices:

- Touch-friendly interface
- Swipe gestures for navigation
- Optimized layouts for small screens
- Progressive Web App capabilities (planned)

## 🔮 Roadmap

### Upcoming Features
- [ ] Drag & drop event rescheduling
- [ ] Calendar sharing and collaboration
- [ ] Recurring events support
- [ ] Time zone support
- [ ] Calendar sync with Google/Outlook
- [ ] Progressive Web App (PWA)
- [ ] Voice commands
- [ ] Smart notifications
- [ ] Event templates
- [ ] Calendar analytics

### Long-term Vision
- Multi-calendar support
- Team collaboration features
- Advanced AI scheduling optimization
- Integration with productivity tools
- Mobile apps (React Native)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** - For powering the AI features
- **Framer Motion** - For beautiful animations
- **Lucide** - For the icon library
- **date-fns** - For date manipulation utilities
- **React Team** - For the amazing framework

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/cal/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cal/discussions)
- **Email**: support@calai.app
- **Twitter**: [@CalAIApp](https://twitter.com/CalAIApp)

---

Made with ❤️ for modern calendar users who want AI-powered productivity.
