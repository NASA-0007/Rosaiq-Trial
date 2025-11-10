# 🚀 Deploying RosaIQ Server to Render

This guide will help you deploy your RosaIQ Air Quality Server to Render's free tier.

## ✅ Prerequisites

- GitHub account
- Render account (sign up at [render.com](https://render.com))
- Your code pushed to a GitHub repository

## 📦 What's Included

Your server is now Render-ready with:
- ✅ Persistent disk storage for SQLite database
- ✅ Automatic configuration via `render.yaml`
- ✅ Health checks for automatic restarts
- ✅ Environment variable support
- ✅ Graceful shutdown handling

## 🎯 Deployment Steps

### Option 1: Blueprint Deploy (Recommended - Easiest)

1. **Push your code to GitHub** if you haven't already:
   ```bash
   git add .
   git commit -m "Render deployment ready"
   git push origin main
   ```

2. **Go to Render Dashboard**: https://dashboard.render.com

3. **Click "New +" → "Blueprint"**

4. **Connect your GitHub repository**:
   - Select your repository
   - Render will automatically detect `render.yaml`

5. **Click "Apply"** - Render will:
   - Create a web service
   - Attach a persistent disk (1GB free)
   - Set up environment variables
   - Deploy your application

6. **Wait for deployment** (2-3 minutes)

7. **Your server is live!** 🎉
   - URL will be like: `https://rosaiq-airgradient-server.onrender.com`

### Option 2: Manual Deploy

If you prefer manual setup:

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Click "New +" → "Web Service"**

3. **Connect your GitHub repository**

4. **Configure the service**:
   - **Name**: `rosaiq-airgradient-server`
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

5. **Add Persistent Disk**:
   - Scroll to "Disks" section
   - Click "Add Disk"
   - **Name**: `rosaiq-data`
   - **Mount Path**: `/opt/render/project/.data`
   - **Size**: `1 GB` (free tier limit)

6. **Add Environment Variables**:
   - `NODE_VERSION` = `18.17.0`
   - `DB_PATH` = `/opt/render/project/.data/rosaiq-airquality.db`
   - `LOG_LEVEL` = `info`
   - `HOST` = `0.0.0.0`
   - (PORT is auto-set by Render)

7. **Click "Create Web Service"**

8. **Wait for deployment** (2-3 minutes)

## 🔧 Post-Deployment Configuration

### Configure Your AirGradient Device

Once deployed, configure your device to send data to your Render URL:

```bash
# Replace with your Render URL and device serial number
curl -X PUT -H "Content-Type: application/json" \
  -d '{"httpDomain":"your-app-name.onrender.com"}' \
  http://airgradient_<serial>.local/config
```

### Access Your Dashboard

Open your browser and navigate to:
```
https://your-app-name.onrender.com
```

## 📊 Free Tier Limits

Render's free tier includes:
- ✅ 512 MB RAM
- ✅ Shared CPU
- ✅ 1 GB persistent disk storage
- ✅ Automatic SSL certificates
- ✅ Custom domains supported
- ⚠️ Sleeps after 15 minutes of inactivity
- ⚠️ 750 hours/month free (enough for 24/7 if only one service)

### About Sleep Mode

- Your service sleeps after 15 minutes of no requests
- First request after sleep takes ~30 seconds to wake up
- Subsequent requests are instant
- Data is preserved (thanks to persistent disk)

**To keep your service awake 24/7** (optional):
- Use a free uptime monitor (UptimeRobot, Cronitor)
- Ping your service every 10 minutes
- Or upgrade to Render's paid plan ($7/month)

## 🔐 Optional: Add API Authentication

For production use, it's recommended to enable API authentication:

1. **In Render Dashboard**, add environment variables:
   - `ENABLE_AUTH` = `true`
   - `API_KEY` = `your-secure-random-key-here`

2. **Update your AirGradient device** to include the API key:
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-secure-random-key-here" \
     -d '{"rco2":450,"pm02":12,"atmp":22.5}' \
     https://your-app-name.onrender.com/sensors/rosaiq:SERIAL/measures
   ```

## 🐛 Troubleshooting

### View Logs
In Render Dashboard → Your Service → "Logs" tab

### Common Issues

**Database errors**:
- Check that persistent disk is attached
- Verify `DB_PATH` environment variable
- Check disk space usage in Render dashboard

**Service won't start**:
- Check logs for errors
- Verify Node.js version is 14+
- Ensure all dependencies are in `package.json`

**Device can't connect**:
- Verify your Render URL is correct
- Check firewall settings
- Ensure device is on same network (for initial config)
- Check API authentication settings

**Service sleeping too often**:
- Set up an uptime monitor
- Or upgrade to paid plan ($7/month for always-on)

## 📈 Monitoring

### Built-in Render Monitoring
Render provides:
- CPU and memory usage graphs
- Request logs
- Deployment history
- Disk usage

### Set Up Uptime Monitoring (Free)

Use [UptimeRobot](https://uptimerobot.com) (free):
1. Sign up for free
2. Create HTTP(s) monitor
3. URL: `https://your-app-name.onrender.com/api/devices`
4. Interval: 5 minutes
5. Get alerts via email if service goes down

## 🔄 Updating Your Deployment

To update your server:

```bash
# Make changes to your code
git add .
git commit -m "Update server"
git push origin main
```

Render will automatically detect the push and redeploy (takes ~2-3 minutes).

## 💾 Database Backups

**Important**: Set up regular backups of your database!

### Manual Backup via Render Shell

1. Go to Render Dashboard → Your Service → "Shell" tab
2. Run:
   ```bash
   cp /opt/render/project/.data/rosaiq-airquality.db /tmp/backup.db
   # Then download from /tmp/
   ```

### Automated Backups (Recommended)

Create a backup endpoint in your server and schedule backups using:
- GitHub Actions (free)
- Render Cron Jobs (paid feature)
- External scheduler (cron-job.org)

## 🌐 Custom Domain (Optional)

To use your own domain:

1. In Render Dashboard → Your Service → "Settings"
2. Scroll to "Custom Domains"
3. Click "Add Custom Domain"
4. Follow DNS instructions
5. SSL certificate is automatic and free!

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **RosaIQ Issues**: Create an issue in your GitHub repo

## 🎉 You're All Set!

Your RosaIQ Air Quality Server is now running on Render with:
- ✅ Persistent data storage
- ✅ Automatic SSL
- ✅ Free hosting
- ✅ Auto-deploys on git push
- ✅ Professional monitoring

Enjoy your air quality monitoring! 🌟
