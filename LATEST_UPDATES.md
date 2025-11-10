# 🎉 Latest Updates - Self-Service Features

**Last Updated**: December 2024

## What's New

### ✨ Self-Service User Registration

Users no longer need admin approval to use the system!

**Features**:
- ✅ Sign up form on login page with toggle between login/signup
- ✅ Automatic validation (username min 3 chars, password min 6 chars)
- ✅ Auto-login after successful registration
- ✅ Email field optional for future features
- ✅ New users get 'user' role by default (admins must be created manually)

**How It Works**:
1. Visit login page → Click "Sign up"
2. Enter credentials → Submit
3. Account created → Logged in → Redirected to dashboard

### 📱 Device Claiming by Serial Number

Users can now claim their own devices without admin intervention!

**Features**:
- ✅ "Claim Device" button on user dashboard
- ✅ Modal popup for entering serial number
- ✅ Validation ensures device exists and is unassigned
- ✅ Device must have connected to server at least once
- ✅ Instant assignment and dashboard refresh

**How It Works**:
1. Device connects → Auto-registers as unassigned
2. User clicks "+ Claim Device"
3. Enter serial number → Submit
4. Device assigned → Appears in dashboard

## Technical Implementation

### Backend Changes

#### New API Endpoints

**POST `/api/auth/signup`**
```javascript
// Request
{
  "username": "john_doe",
  "password": "secure_pass123",
  "email": "john@example.com"  // optional
}

// Response (200)
{
  "id": 2,
  "username": "john_doe",
  "email": "john@example.com",
  "role": "user"
}
```

**POST `/api/devices/claim`**
```javascript
// Request
{
  "serialNumber": "84fce612eabc"
}

// Response (200)
{
  "success": true,
  "deviceId": 5,
  "serialNumber": "84fce612eabc"
}

// Error (409)
{
  "error": "Device is already assigned to another user"
}
```

#### New Database Methods

**`database.js`**:
- `getDeviceBySerial(serialNumber)` - Lookup device by serial number
- Used by claim endpoint to validate and find devices

#### Authentication Flow

**`server.js`**:
1. Session middleware moved before static file serving (fixes admin access bug)
2. Signup endpoint validates username uniqueness
3. Password hashed with bcrypt before storage
4. Auto-creates session after signup
5. Returns user object (without password)

### Frontend Changes

#### Updated Files

**`public/login.html`**:
- Added signup form alongside login form
- Toggle button switches between forms ("Sign up" ↔ "Login")
- Separate submit handlers for login vs signup
- Client-side validation before submission
- Auto-redirects after successful signup

**`public/dashboard.html`**:
- Added "+ Claim Device" button in header
- New modal for serial number input
- `claimDevice()` function calls `/api/devices/claim`
- Success → Closes modal, refreshes dashboard
- Error → Shows alert with error message
- Modal closes on outside click

#### UI/UX Improvements

1. **Dual-Mode Login Page**:
   - Clean toggle between login and signup
   - No page reload needed
   - Consistent styling between forms

2. **Dashboard Device Claiming**:
   - Prominent "+ Claim Device" button
   - Simple modal with clear instructions
   - Real-time feedback on success/failure
   - Auto-refresh to show newly claimed device

3. **Error Handling**:
   - Clear error messages for all failure cases
   - Validation feedback before submission
   - Network error handling

## Security Considerations

### What's Protected

✅ **Password Security**:
- Bcrypt hashing with 10 rounds
- Never stored in plain text
- Not returned in API responses

✅ **Role Enforcement**:
- Only 'user' role can be created via signup
- Admin role must be created manually
- Prevents privilege escalation

✅ **Device Ownership**:
- Users can only claim unassigned devices
- Cannot steal devices from other users
- Ownership checks on all device operations

✅ **Session Management**:
- HTTP-only cookies (XSS protection)
- 24-hour expiration
- Secure flag in production

### What Could Be Enhanced

⚠️ **Future Improvements**:
- Rate limiting on signup endpoint (prevent spam accounts)
- Email verification for new accounts
- CAPTCHA on signup form
- Password strength meter
- "Forgot password" flow

## Migration Guide

### For Existing Deployments

If you already have the multi-user system deployed:

**1. Update Code**:
```bash
git pull origin main
npm install  # No new dependencies needed
```

**2. Restart Server**:
```bash
npm start
```

**3. Test Features**:
- Visit login page → Try signup
- Create test account
- Claim a device by serial

**No Database Migration Needed** - All required tables already exist!

### For New Deployments

Follow the standard deployment process in `RENDER_DEPLOYMENT.md`:

1. Push to GitHub
2. Deploy on Render with Blueprint (`render.yaml`)
3. Wait for build to complete
4. Login with default admin (username: `admin`, password: `admin123`)
5. Share server URL with users for self-signup

## User Communication

### Email Template for Users

```
Subject: New Self-Service Features Available! 🎉

Hi there,

Great news! You can now set up your AirGradient monitoring account yourself:

1. Visit: https://your-server.onrender.com
2. Click "Sign up" to create your account
3. Click "+ Claim Device" on your dashboard
4. Enter your device serial number

No more waiting for admin approval!

Questions? Check out the guide: [Link to SELF_SERVICE_GUIDE.md]

Happy monitoring!
```

## Testing Checklist

Before announcing to users:

### Backend Tests
- [ ] Signup with valid credentials → Success
- [ ] Signup with existing username → Error 400
- [ ] Signup with short username → Error 400
- [ ] Signup with short password → Error 400
- [ ] Login after signup → Success
- [ ] Claim unassigned device → Success
- [ ] Claim assigned device → Error 409
- [ ] Claim non-existent device → Error 404

### Frontend Tests
- [ ] Toggle between login/signup forms → Works
- [ ] Submit signup form → Creates account
- [ ] Auto-redirect after signup → Goes to dashboard
- [ ] "+ Claim Device" button → Opens modal
- [ ] Enter serial and claim → Adds device
- [ ] Close modal on outside click → Works
- [ ] Dashboard refreshes after claim → Shows new device

### Security Tests
- [ ] Signup creates only 'user' role → Verified
- [ ] Cannot create admin via signup → Blocked
- [ ] Password is hashed in database → Verified
- [ ] Session created after signup → Verified
- [ ] Cannot claim already assigned device → Blocked

## Rollback Plan

If issues arise after deployment:

### Quick Rollback (Keep Features, Disable UI)

**Option 1**: Hide signup form
```javascript
// In public/login.html, add:
document.getElementById('signupForm').style.display = 'none';
document.querySelector('.toggle-link').style.display = 'none';
```

**Option 2**: Hide claim button
```javascript
// In public/dashboard.html, add:
document.querySelector('.btn-primary').style.display = 'none';
```

### Full Rollback (Revert Code)

```bash
git revert HEAD~3  # Reverts last 3 commits (signup feature)
git push origin main
```

Then redeploy on Render.

## Support & Documentation

**User Documentation**:
- `SELF_SERVICE_GUIDE.md` - End-user guide for signup and claiming

**Technical Documentation**:
- `AUTHENTICATION_GUIDE.md` - Authentication system overview
- `IMPLEMENTATION_SUMMARY.md` - Complete feature list
- `RENDER_DEPLOYMENT.md` - Deployment instructions

**Admin Documentation**:
- Admin panel still works as before
- Admins can still manually create users
- Admins can unassign devices if needed

## Known Limitations

1. **No Email Verification**: Accounts are active immediately
2. **No Password Recovery**: Users must contact admin
3. **No Rate Limiting**: Multiple accounts can be created quickly
4. **No Username Changes**: Usernames are permanent
5. **No Device Transfer**: Must unassign then re-claim

These may be addressed in future updates.

## Metrics to Track

After deployment, monitor:

- **Signup Rate**: How many new users per day?
- **Claim Success Rate**: % of successful vs failed claims
- **Device Adoption**: Time from device connection to claim
- **Admin Overhead**: Reduction in manual user/device management
- **Support Tickets**: Issues related to signup/claiming

## Version History

**v2.1.0** (Current)
- ✅ Self-service signup
- ✅ Device claiming by serial
- ✅ Dual-mode login page
- ✅ Dashboard claim button

**v2.0.0**
- Multi-user authentication
- Admin panel
- Device assignment
- OTA firmware updates

**v1.0.0**
- Basic AirGradient data collection
- Single-user system

## What's Next?

Potential future features:

1. **Email Verification** - Confirm email addresses
2. **Password Reset** - Self-service password recovery
3. **Device Transfer** - Transfer ownership between users
4. **Bulk Operations** - Claim multiple devices at once
5. **QR Code Claiming** - Scan device QR code to claim
6. **Mobile App** - Native iOS/Android apps
7. **Webhooks** - Alerts when air quality changes
8. **Data Export** - Download historical data as CSV

---

**Questions or Issues?**  
Open an issue on GitHub or contact your system administrator.
