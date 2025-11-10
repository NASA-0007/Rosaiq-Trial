# ✅ Render Deployment Checklist

## Files Modified/Created for Render Compatibility

### ✨ New Files
- ✅ `render.yaml` - Render Blueprint configuration
- ✅ `.env.example` - Environment variables template
- ✅ `RENDER_DEPLOYMENT.md` - Comprehensive deployment guide
- ✅ `test-server.ps1` - Windows testing script
- ✅ `test-server.sh` - Linux/Mac testing script

### 🔧 Modified Files
- ✅ `config.js` - Added comments for Render configuration
- ✅ `database.js` - Auto-creates database directory (for Render persistent disk)
- ✅ `package.json` - Updated Node.js version to 18+ (Render recommendation)
- ✅ `README.md` - Added Render deployment section

## 🚀 Quick Deploy Steps

### 1. Test Locally (Optional but Recommended)
```powershell
# On Windows
.\test-server.ps1

# On Linux/Mac
chmod +x test-server.sh
./test-server.sh
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### 3. Deploy to Render

**Option A: Blueprint Deploy (Easiest)**
1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Click "Apply"
5. Wait 2-3 minutes ✨

**Option B: Manual Deploy**
Follow detailed steps in `RENDER_DEPLOYMENT.md`

### 4. Configure Your AirGradient Device
```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"httpDomain":"your-app-name.onrender.com"}' \
  http://airgradient_<serial>.local/config
```

### 5. Access Dashboard
```
https://your-app-name.onrender.com
```

## 🎯 What Makes This Render-Ready?

### ✅ Persistent Storage
- Uses Render's persistent disk (`/opt/render/project/.data`)
- SQLite database survives deployments
- 1GB free storage included

### ✅ Environment Variables
- Port automatically set by Render
- Database path configured for persistent disk
- All configs via environment variables

### ✅ Graceful Shutdown
- Handles SIGTERM and SIGINT signals
- Closes database connections properly
- Safe redeployments

### ✅ Auto-scaling Ready
- Binds to `0.0.0.0` for container compatibility
- Health check enabled at root path
- Stateless request handling

## 📊 Render Free Tier Features

| Feature | Free Tier |
|---------|-----------|
| RAM | 512 MB |
| CPU | Shared |
| Disk | 1 GB persistent |
| SSL | ✅ Automatic |
| Custom Domain | ✅ Supported |
| Auto-deploy | ✅ From GitHub |
| Sleep Mode | After 15 min inactivity |
| Monthly Hours | 750 hours free |

## 🔐 Security Recommendations

For production deployment:

1. **Enable API Authentication**
   ```bash
   # In Render Dashboard, add:
   ENABLE_AUTH=true
   API_KEY=your-secure-random-key-123
   ```

2. **Use Custom Domain** (optional)
   - Add your domain in Render dashboard
   - Free SSL included

3. **Set Up Monitoring**
   - Use UptimeRobot (free) to keep service awake
   - Monitor uptime and get alerts

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Database errors | Check persistent disk is attached in Render |
| Service sleeping | Set up UptimeRobot or upgrade to paid plan |
| Build fails | Check Node.js version is 18+ |
| Device can't connect | Verify Render URL in device config |

## 📝 Next Steps After Deployment

1. ✅ Configure AirGradient device
2. ✅ Test data reception
3. ✅ Set up uptime monitoring (optional)
4. ✅ Enable API authentication (recommended)
5. ✅ Set up database backups (important!)

## 🎉 You're Ready!

Your RosaIQ server is now configured for Render deployment. Follow the steps above or read `RENDER_DEPLOYMENT.md` for detailed instructions.

**Questions?** Check the deployment guide or Render documentation.
