# 🆓 FREE Render Deployment Guide

## Step 1: Sign Up for Render (FREE)

1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with your GitHub account
4. **No credit card required!**

## Step 2: Deploy Your Backend

1. **Click "New +" → "Web Service"**
2. **Connect GitHub repository**
3. **Select your repository**
4. **Configure settings:**

### Build & Deploy Settings:
```
Name: negari-backend (or any name you like)
Region: Oregon (US West) - closest to you
Branch: main (or your main branch)
Root Directory: backend
Runtime: Node
Build Command: npm run render-build
Start Command: npm start
```

### Environment Variables:
Click "Advanced" and add these environment variables:

```
NODE_ENV=production
DATABASE_URL=your_neon_database_connection_string
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=https://your-frontend-domain.vercel.app
PORT=10000
```

**Important:** 
- Get your `DATABASE_URL` from Neon dashboard
- Use a strong `JWT_SECRET` (generate one online)
- Update `FRONTEND_URL` after deploying frontend

## Step 3: Deploy

1. Click "Create Web Service"
2. Wait 5-10 minutes for deployment
3. Your backend will be available at: `https://your-app-name.onrender.com`

## Step 4: Test Your Deployment

Visit: `https://your-app-name.onrender.com/api/test`

You should see:
```json
{
  "status": "success",
  "message": "API test endpoint is working",
  "timestamp": "2024-01-XX..."
}
```

## Step 5: Update Frontend

Update your frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=https://your-app-name.onrender.com/api
```

## Free Tier Limitations

- **Sleep after 15 minutes** of inactivity
- **Wakes up in ~30 seconds** when accessed
- **512MB RAM**
- **750 hours/month** (enough for 24/7)

## Troubleshooting

### Common Issues:
1. **Build fails**: Check Node.js version in package.json
2. **Database connection**: Verify DATABASE_URL
3. **CORS errors**: Update FRONTEND_URL

### Logs:
- View logs in Render dashboard
- Check "Events" tab for deployment status

## Alternative: Railway (Also Free)

If Render doesn't work, try Railway:
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Deploy from GitHub repo
4. $5 monthly credit (usually enough)
