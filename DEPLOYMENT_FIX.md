# Cloudflare Pages Deployment Fix

## Current Issue
The deployment is failing because it's trying to use `wrangler deploy` (for Workers) instead of `wrangler pages deploy` (for Pages).

## Quick Fix - Use Git Integration (Recommended)

Instead of using CLI deployment, use Cloudflare Pages Git integration:

1. **Go to Cloudflare Pages Dashboard**: https://dash.cloudflare.com/pages
2. **Click "Create a project"**
3. **Connect to GitHub** and select your repository: `rksingh-dev/CARBONIQOO`
4. **Configure build settings**:
   ```
   Framework preset: None
   Build command: pnpm build
   Build output directory: dist/spa
   Root directory: (leave empty)
   ```
5. **Set environment variables** (if needed):
   ```
   NODE_ENV = production
   PING_MESSAGE = ping pong
   ```
6. **Click "Save and Deploy"**

## Why Git Integration is Better

- ✅ Automatic deployments on every push
- ✅ Preview deployments for pull requests  
- ✅ Proper Pages configuration
- ✅ Built-in CI/CD pipeline
- ✅ No CLI configuration issues

## Manual CLI Deployment (Alternative)

If you must use CLI deployment:

```bash
# Build the project
pnpm build

# Deploy using Pages command (not Workers)
npx wrangler pages deploy dist/spa --project-name=carboniq
```

## Current Build Status

✅ Dependencies install correctly
✅ Build completes successfully  
❌ Deployment fails due to wrong command

The build is working fine - it's just the deployment method that needs to be corrected.
