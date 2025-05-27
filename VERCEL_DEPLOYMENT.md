# Deploying Backend to Vercel

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Neon Database**: Your PostgreSQL database should be set up on Neon

## Deployment Steps

### 1. Connect GitHub Repository

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `backend` folder as the root directory

### 2. Configure Build Settings

Vercel should auto-detect your Node.js project, but verify:

- **Framework Preset**: Other
- **Root Directory**: `backend` (if deploying only backend)
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Set Environment Variables

In Vercel dashboard, go to your project → Settings → Environment Variables and add:

```
NODE_ENV=production
DATABASE_URL=your_neon_database_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://your-frontend-domain.vercel.app
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### 4. Deploy

Click "Deploy" and Vercel will:
1. Install dependencies
2. Build your TypeScript code
3. Deploy as serverless functions

## Important Notes

### Database Considerations

- **Neon Database**: Perfect for Vercel (serverless-friendly)
- **Connection Pooling**: Neon handles this automatically
- **Cold Starts**: First request might be slower due to serverless nature

### File Storage

- **Static Files**: The `public` folder will be served by Vercel
- **Generated Reports**: Consider using cloud storage (AWS S3, Cloudinary) for production

### Limitations

- **Function Timeout**: 30 seconds max (configurable in vercel.json)
- **Memory**: 1GB max for free tier
- **Cold Starts**: ~1-2 second delay on first request after inactivity

## Testing Deployment

After deployment, test your API:

```bash
curl https://your-backend-domain.vercel.app/api/test
```

## Troubleshooting

### Common Issues

1. **Build Errors**: Check TypeScript compilation
2. **Database Connection**: Verify Neon connection string
3. **CORS Issues**: Update FRONTEND_URL environment variable
4. **Function Timeout**: Optimize database queries

### Logs

View logs in Vercel dashboard → Functions tab → View Function Logs

## Alternative: Railway (Recommended)

If you encounter issues with Vercel's serverless limitations, consider Railway:
- Better for traditional Express apps
- Persistent connections
- Built-in PostgreSQL
- $5/month credit (usually sufficient)
