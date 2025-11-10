# 🔐 Multi-User Authentication System - Setup Guide

## New Features

### ✨ User Authentication & Authorization
- **Multi-user support** with role-based access control
- **Admin panel** for managing users, devices, and firmware
- **User dashboard** showing only assigned devices
- **Secure session management** with bcrypt password hashing

### 📱 Device Management
- **Device assignment** - Admin can assign devices to specific users
- **Custom device names** - Users can rename their devices
- **Device filtering** - Users see only their assigned devices
- **Unassigned device tracking** - New devices appear in admin panel

### 🔄 OTA Firmware Updates
- **Firmware upload** via admin panel (.bin files)
- **AirGradient-compatible OTA endpoint**
- **Version management** and tracking
- **Automatic update delivery** to devices

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

New dependencies added:
- `express-session` - Session management
- `bcryptjs` - Password hashing
- `multer` - File uploads
- `cookie-parser` - Cookie handling

### 2. Start Server

```bash
npm start
```

### 3. Login

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT:** Change the default admin password immediately in production!

## User Roles

### Admin Role
- Access to admin panel (`/admin/`)
- Can create/delete users
- Can assign devices to users
- Can upload firmware
- Sees all devices

### User Role
- Access to personal dashboard (`/dashboard.html`)
- Can see only assigned devices
- Can rename their devices
- Cannot access admin features

## System Architecture

### Authentication Flow

```
1. User visits website → Redirects to /login.html
2. Login → Creates session → Redirects based on role
   - Admin → /admin/
   - User → /dashboard.html
3. All API requests check session authentication
4. Logout → Destroys session → Redirects to login
```

### Device Assignment Flow

```
1. Device connects and sends data → Auto-registered (unassigned)
2. Device appears in admin panel "Unassigned Devices" tab
3. Admin assigns device to user
4. Device appears in user's dashboard
5. User can rename device with custom name
```

### OTA Update Flow

```
1. Admin uploads .bin file via admin panel
2. Firmware stored in /firmware directory
3. Device requests: GET /sensors/rosaiq:<serial>/generic/os/firmware.bin?current_firmware=<version>
4. Server checks latest version
5. If update available → Sends .bin file
6. If up-to-date → Returns 304 Not Modified
```

## API Endpoints

### Authentication

```
POST   /api/auth/login       - User login
POST   /api/auth/logout      - User logout
GET    /api/auth/session     - Get current session
POST   /api/auth/register    - Create user (admin only)
```

### User Management (Admin Only)

```
GET    /api/users            - Get all users
DELETE /api/users/:userId    - Delete user
```

### Device Management

```
GET    /api/devices                    - Get devices (filtered by user)
GET    /api/devices/:deviceId          - Get device details
PUT    /api/devices/:deviceId/name     - Update device custom name
POST   /api/devices/:deviceId/assign   - Assign device (admin only)
POST   /api/devices/:deviceId/unassign - Unassign device (admin only)
GET    /api/admin/devices/unassigned   - Get unassigned devices (admin only)
```

### Firmware OTA

```
GET    /sensors/:deviceId/generic/os/firmware.bin?current_firmware=<version>
       - OTA firmware download (AirGradient compatible)
       
POST   /api/admin/firmware/upload      - Upload firmware (admin only)
GET    /api/admin/firmware             - List firmware (admin only)
DELETE /api/admin/firmware/:id         - Delete firmware (admin only)
```

## Database Schema Changes

### New Tables

**users**
```sql
- id (PRIMARY KEY)
- username (UNIQUE)
- password_hash
- email
- role ('admin' | 'user')
- created_at
- last_login
```

**devices** (updated)
```sql
- device_id (PRIMARY KEY)
- serial_number (UNIQUE)
- custom_name          ← NEW: User-defined name
- user_id              ← NEW: Foreign key to users
- (other existing fields...)
```

**firmware**
```sql
- id (PRIMARY KEY)
- version (UNIQUE)
- filename
- file_path
- file_size
- uploaded_by (Foreign key to users)
- uploaded_at
- notes
```

## File Structure

```
custom-server/
├── middleware/
│   └── auth.js           ← NEW: Authentication middleware
├── firmware/             ← NEW: Firmware uploads directory
├── public/
│   ├── login.html        ← NEW: Login page
│   ├── dashboard.html    ← NEW: User dashboard
│   ├── admin/
│   │   └── index.html    ← NEW: Admin panel
│   ├── index.html        (redirects to login)
│   ├── app.js
│   └── styles.css
├── server.js             (updated with auth routes)
├── database.js           (updated with user/firmware methods)
├── config.js             (updated with session config)
└── package.json          (updated dependencies)
```

## Security Features

### Password Security
- Passwords hashed with bcrypt (10 rounds)
- Never stored in plain text
- Secure password comparison

### Session Security
- HTTP-only cookies (prevents XSS)
- Secure cookies in production (HTTPS only)
- 24-hour session expiration
- Random session secrets

### Access Control
- Role-based authorization
- Ownership verification for devices
- Admin-only endpoints protected
- Session validation on every request

## Configuration

### Environment Variables

Add to `.env` or Render environment variables:

```bash
# Session Security
SESSION_SECRET=your-super-secret-random-string-here

# Existing variables
PORT=3000
HOST=0.0.0.0
DB_PATH=./rosaiq-airquality.db
```

### Production Deployment

**Render.com:**
1. Deploy as usual
2. Add `SESSION_SECRET` environment variable
3. Firmware stored on persistent disk
4. Sessions stored in memory (for multi-instance, use Redis)

## Admin Panel Features

### Dashboard Tabs

1. **All Devices** - View all registered devices with status
2. **Users** - Create, view, delete users
3. **Firmware** - Upload and manage firmware files
4. **Device Assignments** - Assign unassigned devices to users

### User Management
- Create new users with username/password
- Assign admin or user role
- Delete users (except default admin)
- View last login times

### Firmware Management
- Upload .bin files with version number
- Add release notes
- View all uploaded firmware
- Delete old firmware versions
- Latest firmware automatically served via OTA

## User Dashboard Features

- **My Devices Only** - See only assigned devices
- **Rename Devices** - Click "Rename" button on any device
- **Real-time Data** - Live metrics and status
- **Auto-refresh** - Updates every 30 seconds
- **Responsive Design** - Works on mobile devices

## Device Configuration for OTA

Configure your AirGradient device to use the OTA endpoint:

```cpp
// In your device firmware, set OTA URL to:
String otaUrl = "http://your-server.com/sensors/rosaiq:" + serialNumber + "/generic/os/firmware.bin?current_firmware=" + currentVersion;
```

The server will:
- Return 304 if device has latest firmware
- Return .bin file if update available
- Log OTA update events

## Testing

### Create Test User

1. Login as admin
2. Go to "Users" tab
3. Click "Create User"
4. Enter details, select "user" role
5. Click "Create User"

### Assign Device to User

1. Login as admin
2. Go to "Device Assignments" tab
3. Find unassigned device
4. Click "Assign to User"
5. Select user from dropdown
6. Click "Assign"

### Test User Dashboard

1. Logout from admin
2. Login with test user credentials
3. See only assigned devices
4. Rename a device
5. View real-time data

### Test OTA Update

1. Login as admin
2. Go to "Firmware" tab
3. Upload a .bin file with version number
4. Device will automatically check for updates
5. Monitor updates in admin panel

## Troubleshooting

### "Already logged in" issue
- Clear cookies and reload
- Use incognito mode for testing

### Session not persisting
- Check SESSION_SECRET is set
- Verify cookies are enabled
- Check HTTPS in production

### Device not appearing
- Verify device is sending data
- Check `/api/admin/devices/unassigned`
- Review server logs

### Firmware upload fails
- Check file is .bin format
- Verify file size < 10MB
- Check disk space

### Permission denied errors
- Verify user role
- Check device ownership
- Review server logs

## Migration from Old Version

If upgrading from previous version:

1. Backup your database:
   ```bash
   cp rosaiq-airquality.db rosaiq-airquality.db.backup
   ```

2. Install new dependencies:
   ```bash
   npm install
   ```

3. Start server - new tables will be created automatically

4. Default admin user will be created with:
   - Username: `admin`
   - Password: `admin123`

5. All existing devices will be unassigned

6. Login as admin and assign devices to users

## Best Practices

### Security
- ✅ Change default admin password immediately
- ✅ Use strong passwords for all users
- ✅ Set SESSION_SECRET environment variable
- ✅ Use HTTPS in production
- ✅ Regularly update firmware
- ✅ Review user access periodically

### Device Management
- ✅ Give devices meaningful custom names
- ✅ Assign devices promptly
- ✅ Monitor unassigned devices
- ✅ Remove inactive users
- ✅ Keep firmware up to date

### Firmware Updates
- ✅ Test firmware before uploading
- ✅ Use semantic versioning (1.0.0, 1.1.0, etc.)
- ✅ Add meaningful release notes
- ✅ Keep backup of previous versions
- ✅ Monitor OTA update success rate

## Support

For issues or questions:
1. Check server logs
2. Review this documentation
3. Check database for consistency
4. Create GitHub issue

## License

MIT License - Same as parent project
