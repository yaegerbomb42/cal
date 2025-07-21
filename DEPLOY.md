# Deployment Guide

## Deploying to Vercel

This application is optimized for deployment on Vercel with zero configuration.

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yaegerbomb42/cal)

### Manual Deployment

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy to preview**:
   ```bash
   npm run deploy:preview
   ```

3. **Deploy to production**:
   ```bash
   npm run deploy
   ```

### Environment Variables

If you want to set the Gemini API key as an environment variable in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add `VITE_GEMINI_API_KEY` with your API key value
4. Redeploy your application

### Build Configuration

The application uses the following Vercel configuration (`vercel.json`):

- **Framework**: Vite (auto-detected)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **SPA Routing**: All routes redirect to `index.html`
- **Static Asset Caching**: 1-year cache for assets with immutable headers

### Troubleshooting

**Build Errors**: Ensure all dependencies are installed:
```bash
npm install
npm run build
```

**Routing Issues**: The `vercel.json` configuration handles client-side routing. If you're experiencing routing issues, ensure the configuration is properly set up.

**Environment Variables**: Remember that Vite environment variables must be prefixed with `VITE_` to be available in the client.