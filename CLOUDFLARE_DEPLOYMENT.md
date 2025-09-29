# Cloudflare Pages Deployment Guide

This guide explains how to deploy your CarbonIQ application to Cloudflare Pages.

## Prerequisites

1. Install Wrangler CLI globally:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

## Environment Variables

You need to set up the following environment variables in your Cloudflare Pages dashboard:

### Required Variables
- `NODE_ENV`: Set to `production`
- `PING_MESSAGE`: Custom ping message (optional)

### Firebase Configuration (if using Firebase)
- `FIREBASE_API_KEY`: Your Firebase API key
- `FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
- `FIREBASE_APP_ID`: Your Firebase app ID

### Other Environment Variables
Add any other environment variables your application needs from your `.env` file.

## Deployment Steps

### Recommended: Connect to Git Repository (Automatic Deployment)

1. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
2. Click "Create a project"
3. Connect your Git repository (GitHub: `rksingh-dev/CARBONIQOO`)
4. Configure build settings:
   - **Framework preset**: None
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist/spa`
   - **Root directory**: `/` (leave empty if repository root)
   - **Node.js version**: 18 or higher

5. Set environment variables in the Cloudflare Pages dashboard (see Environment Variables section below)

### Option 2: Manual Deployment (CLI)

If you prefer manual deployment:

1. Build the project:
   ```bash
   pnpm build
   ```

2. Deploy to Cloudflare Pages:
   ```bash
   npx wrangler pages deploy dist/spa --project-name=carboniq
   ```

**Note**: The automatic Git integration is recommended as it will automatically deploy when you push changes to your repository.

## Build Configuration

The project is configured with:

- **Build Command**: `pnpm build:cf` (builds both client and functions)
- **Output Directory**: `dist/spa`
- **Functions Directory**: `functions/` (automatically detected)
- **Node.js Version**: Compatible with Cloudflare Pages (Node.js 18+)

## API Routes

All API routes are handled by Cloudflare Functions in the `functions/api/[[path]].ts` file. This catch-all function routes requests to the appropriate handlers based on the URL path.

Available API endpoints:
- `GET /api/ping` - Health check
- `GET /api/demo` - Demo endpoint
- `POST /api/admin/login` - Admin login
- `GET /api/admin/validate` - Validate admin session
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/:id` - Get specific ticket
- `PATCH /api/tickets/:id` - Update ticket status
- `DELETE /api/tickets/:id` - Delete ticket
- `POST /api/upload-report` - Upload report
- `POST /api/analyze-report` - Analyze report
- `POST /api/balance/store` - Store user balance
- `GET /api/balance/:userId` - Get user balance
- `POST /api/marketplace/list` - Create marketplace listing
- `GET /api/marketplace/listings` - Get marketplace listings
- `POST /api/marketplace/buy` - Buy from marketplace

## Local Development with Cloudflare

To test your application locally with Cloudflare Pages:

```bash
pnpm cf:dev
```

This will start a local development server that mimics the Cloudflare Pages environment.

## Troubleshooting

### Common Issues

1. **Build Failures**: Ensure all dependencies are properly installed and TypeScript compiles without errors.

2. **API Routes Not Working**: Check that the `functions/api/[[path]].ts` file is properly configured and all route handlers are imported.

3. **Environment Variables**: Make sure all required environment variables are set in the Cloudflare Pages dashboard.

4. **CORS Issues**: The API function includes CORS headers, but you may need to adjust them based on your domain.

### Debugging

- Check the Cloudflare Pages build logs for detailed error information
- Use `wrangler pages dev` for local testing
- Monitor the Functions tab in your Cloudflare Pages dashboard for runtime errors

## Performance Optimization

- Static assets are automatically cached by Cloudflare's CDN
- API functions run on Cloudflare's edge network for low latency
- Consider implementing caching strategies for frequently accessed data

## Security Considerations

- Never commit sensitive environment variables to your repository
- Use Cloudflare's security features like WAF and DDoS protection
- Implement proper authentication and authorization in your API endpoints
