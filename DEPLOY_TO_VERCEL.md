# Deploy Stackr to Vercel - Quick Guide

## Prerequisites
- Vercel account (free at vercel.com)
- Git repository (GitHub/GitLab/Bitbucket)

## Method 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Run deployment**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Login to Vercel (if first time)
   - Select scope
   - Link to existing project? **No**
   - Project name: **stackr** (or your choice)
   - Which directory? **./** (current directory)
   - Want to override settings? **No**

4. **Add environment variables** in Vercel Dashboard:
   - Go to your project → Settings → Environment Variables
   - Add these required variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Optional API keys for full functionality:
     ```
     NEXT_PUBLIC_RAWG_API_KEY=your_rawg_key
     NEXT_PUBLIC_OMDB_API_KEY=your_omdb_key
     NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
     ```

## Method 2: Deploy via GitHub

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add PWA support"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import Git Repository
   - Select your repository
   - Configure project (defaults are fine)
   - Add environment variables
   - Deploy

## Post-Deployment

1. **Test PWA Features**:
   - Visit your-app.vercel.app
   - Check for install prompt
   - Test offline mode
   - Try installing on mobile

2. **Custom Domain** (optional):
   - Go to Settings → Domains
   - Add your domain
   - Follow DNS instructions

## Troubleshooting

- **Build errors**: Check logs in Vercel dashboard
- **Missing env vars**: Add them in Settings → Environment Variables
- **PWA not working**: Ensure HTTPS (automatic on Vercel)

## Important Notes

- Vercel automatically handles:
  - HTTPS (required for PWA)
  - Build optimization
  - CDN distribution
  - Automatic deployments from git

- The app will be available at:
  - Preview: `stackr-[branch]-[username].vercel.app`
  - Production: `stackr.vercel.app` (or your custom domain)