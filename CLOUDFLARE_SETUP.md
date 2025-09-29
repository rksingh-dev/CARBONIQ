# Cloudflare Pages Setup Guide

## 🚀 Quick Setup (Recommended)

### Step 1: Create Cloudflare Pages Project

1. Go to: https://dash.cloudflare.com/pages
2. Click: **"Create a project"**
3. Select: **"Connect to Git"**
4. Choose: **GitHub**
5. Select repository: **`rksingh-dev/CARBONIQOO`**

### Step 2: Configure Build Settings

Use these **exact settings**:

```
Framework preset: None
Build command: pnpm build
Build output directory: dist/spa
Root directory: (leave empty)
```

### Step 3: Environment Variables

Add these environment variables:

```
NODE_ENV = production
PING_MESSAGE = ping pong
PINATA_API_KEY = c4b3658b7c2a76db2c17
PINATA_API_SECRET = d26420e369ebba91bfd930208a04ef026c73e1fbed08261c137c91f065067ca4
```

### Step 4: Deploy

Click **"Save and Deploy"** - that's it!

## ✅ What This Setup Provides

- **Automatic deployments** on every push to main branch
- **Preview deployments** for pull requests
- **Cloudflare Functions** for your API endpoints
- **Global CDN** for fast loading worldwide
- **Custom domain** support
- **Analytics** and monitoring

## 🔧 Build Process

Your build will:
1. Install dependencies with `pnpm install`
2. Build the React app with `pnpm build`
3. Deploy static files to CDN
4. Deploy API functions to edge network

## 📁 Project Structure

```
dist/spa/           # Static files (deployed to CDN)
functions/api/      # API endpoints (deployed as Functions)
public/_redirects   # SPA routing configuration
_headers           # Security and CORS headers
```

## 🌐 API Endpoints

After deployment, your API will be available at:
- `https://your-site.pages.dev/api/ping`
- `https://your-site.pages.dev/api/demo`
- `https://your-site.pages.dev/api/admin/login`
- `https://your-site.pages.dev/api/tickets`
- `https://your-site.pages.dev/api/marketplace/listings`
- And all other endpoints defined in `functions/api/[[path]].ts`

## 🔍 Troubleshooting

If you encounter issues:

1. **Check build logs** in Cloudflare Pages dashboard
2. **Verify environment variables** are set correctly
3. **Ensure build command** is `pnpm build` (not `pnpm build:cf`)
4. **Check functions** are in `functions/api/` directory

## 📞 Support

- Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- Functions Docs: https://developers.cloudflare.com/pages/functions/
