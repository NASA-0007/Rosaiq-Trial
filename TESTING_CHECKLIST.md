# Testing Checklist for Self-Service Features

## Pre-Deployment Checks

### Code Review
- [x] All files saved and committed
- [x] No syntax errors in server.js
- [x] No syntax errors in database.js
- [x] No syntax errors in dashboard.html
- [x] No syntax errors in login.html

### Documentation
- [x] SELF_SERVICE_GUIDE.md created
- [x] LATEST_UPDATES.md created
- [x] README.md updated with new features
- [ ] AUTHENTICATION_GUIDE.md updated (optional)

## Post-Deployment Testing

### Authentication Tests

#### Sign Up Flow
- [ ] Visit login page
- [ ] Click "Don't have an account? Sign up"
- [ ] Form toggles to signup mode
- [ ] Enter valid credentials (username ≥3 chars, password ≥6 chars)
- [ ] Submit form
- [ ] Account created successfully
- [ ] Auto-logged in
- [ ] Redirected to /dashboard.html

#### Sign Up Validation
- [ ] Try username with 2 chars → Error displayed
- [ ] Try password with 5 chars → Error displayed
- [ ] Try existing username → Error 400 "Username already exists"
- [ ] Try empty fields → Error displayed

#### Login After Signup
- [ ] Logout from new account
- [ ] Try logging in with new credentials
- [ ] Successfully logs in
- [ ] Redirected to dashboard

### Device Claiming Tests

#### Successful Claim
- [ ] Ensure a device has connected to server (check database or admin panel)
- [ ] Login as new user
- [ ] Click "+ Claim Device" button
- [ ] Modal opens with serial number input
- [ ] Enter device serial number
- [ ] Click "Claim Device"
- [ ] Success message appears
- [ ] Modal closes
- [ ] Dashboard refreshes
- [ ] Device appears in device list

#### Claim Validation
- [ ] Try claiming non-existent device → Error "Device not found"
- [ ] Try claiming already assigned device → Error "Device is already assigned"
- [ ] Try empty serial number → Error "Please enter a device serial number"

#### Device Display
- [ ] Claimed device shows in dashboard
- [ ] Device displays correct serial number
- [ ] Can rename claimed device
- [ ] Renamed device persists after refresh
- [ ] Device shows correct status (Active/Offline)
- [ ] Latest data displays correctly

### Multi-User Isolation Tests

#### User A
- [ ] Sign up as User A
- [ ] Claim Device 1
- [ ] See Device 1 in dashboard
- [ ] Don't see any other devices

#### User B
- [ ] Sign up as User B (different browser/incognito)
- [ ] Claim Device 2
- [ ] See Device 2 in dashboard
- [ ] Don't see Device 1 (User A's device)

#### Cross-User Validation
- [ ] User B tries to claim Device 1 (User A's device) → Error "already assigned"
- [ ] User A still sees only Device 1
- [ ] User B still sees only Device 2

### Admin Panel Tests

#### Admin Access
- [ ] Login as admin (username: admin, password: admin123)
- [ ] Redirected to /admin/
- [ ] Admin panel loads correctly
- [ ] All 4 tabs visible (Devices, Users, Firmware, Assignments)

#### User Management
- [ ] Navigate to "Users" tab
- [ ] See newly registered users in list
- [ ] User roles show as "user"
- [ ] Can delete test users (optional)

#### Device Management
- [ ] Navigate to "Devices" tab
- [ ] See all devices (claimed and unclaimed)
- [ ] Claimed devices show owner username
- [ ] Unclaimed devices show "Unassigned"

#### Unassign Device
- [ ] Admin unassigns Device 1 from User A
- [ ] User A dashboard no longer shows Device 1
- [ ] Device 1 appears in admin's "Unassigned Devices"
- [ ] User B can now claim Device 1

### Session & Security Tests

#### Session Persistence
- [ ] Login as user
- [ ] Refresh page → Still logged in
- [ ] Close browser and reopen → Still logged in (within 24 hours)

#### Logout
- [ ] Click logout button
- [ ] Redirected to login page
- [ ] Try accessing /dashboard.html directly → Redirected to login
- [ ] Try accessing /admin/ directly → Redirected to login

#### Role Protection
- [ ] Login as regular user
- [ ] Try accessing /admin/ directly → Shows login or error
- [ ] Try POST /api/admin/firmware/upload → Error 403 or redirect
- [ ] Try accessing admin-only endpoints → Blocked

### UI/UX Tests

#### Login Page
- [ ] Page loads correctly
- [ ] Logo/header displays
- [ ] Login form visible by default
- [ ] "Sign up" toggle link works
- [ ] Signup form visible after toggle
- [ ] "Back to login" link works
- [ ] Forms are mobile-responsive
- [ ] Error messages display clearly

#### Dashboard
- [ ] Header shows welcome message with username
- [ ] "+ Claim Device" button prominent and visible
- [ ] Device cards display correctly
- [ ] Rename buttons work
- [ ] Logout button works
- [ ] Page auto-refreshes every 30 seconds
- [ ] Mobile-responsive layout

#### Modals
- [ ] Claim modal opens on button click
- [ ] Claim modal closes on cancel
- [ ] Claim modal closes on outside click
- [ ] Rename modal opens on rename click
- [ ] Rename modal closes on cancel
- [ ] Rename modal closes on outside click

### Performance Tests

#### Load Testing
- [ ] Create 5 test users
- [ ] Each user claims 2-3 devices
- [ ] Login as each user → Dashboard loads quickly
- [ ] Admin panel shows all users/devices
- [ ] No performance degradation

#### Database
- [ ] Check database file size
- [ ] Verify user passwords are hashed (not plain text)
- [ ] Verify device assignments in database
- [ ] No duplicate entries

### Error Handling Tests

#### Network Errors
- [ ] Disconnect internet during signup → Error message
- [ ] Disconnect internet during claim → Error message
- [ ] Server restart → Session persists (or graceful re-login)

#### Edge Cases
- [ ] Try very long username (100+ chars) → Handled
- [ ] Try special characters in username → Handled
- [ ] Try SQL injection in username → Blocked
- [ ] Try XSS in device name → Escaped properly

## Render Deployment Tests

### Build & Deploy
- [ ] Push code to GitHub
- [ ] Trigger Render deployment
- [ ] Build completes successfully
- [ ] No build errors
- [ ] Server starts without errors

### Environment
- [ ] Check Node.js version (should be 18.x)
- [ ] Check logs for any warnings
- [ ] Verify persistent disk mounted
- [ ] Database file created in correct location

### Production Access
- [ ] Visit production URL
- [ ] HTTPS working correctly
- [ ] Login page loads
- [ ] Can sign up new user
- [ ] Can claim devices
- [ ] Admin login works
- [ ] All features functional

## Documentation Tests

### README
- [ ] New features mentioned
- [ ] Links to guides work
- [ ] Quick start section clear

### SELF_SERVICE_GUIDE
- [ ] Step-by-step instructions clear
- [ ] Screenshots/examples helpful (if added)
- [ ] Troubleshooting section covers common issues
- [ ] FAQ answers user questions

### LATEST_UPDATES
- [ ] Technical details accurate
- [ ] API examples correct
- [ ] Rollback plan clear
- [ ] Version history complete

## Sign-Off

### Tested By
- Name: _______________
- Date: _______________
- Environment: [ ] Local [ ] Render Production

### Issues Found
- Issue 1: _______________
- Issue 2: _______________
- Issue 3: _______________

### Ready for Production?
- [ ] Yes, all tests passed
- [ ] No, issues found (see above)
- [ ] Partial (specify limitations)

---

## Quick Test Script

For rapid testing, run these commands:

```bash
# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'

# Test device claim (replace SESSION_COOKIE)
curl -X POST http://localhost:3000/api/devices/claim \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=SESSION_COOKIE" \
  -d '{"serialNumber":"84fce612eabc"}'

# Check database
sqlite3 data/airgradient.db "SELECT * FROM users;"
sqlite3 data/airgradient.db "SELECT id, device_id, custom_name, user_id FROM devices;"
```

## Notes

Use this space for testing notes:

---
---
---
