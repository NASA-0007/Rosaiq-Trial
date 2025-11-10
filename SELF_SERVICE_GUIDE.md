# 🚀 Self-Service User Guide

## Overview

The AirGradient Custom Server now supports **self-service registration and device claiming**. Users can create their own accounts and claim devices without admin intervention!

## For End Users

### Getting Started

#### 1. Sign Up for an Account

1. Visit your server URL (e.g., `https://your-server.onrender.com`)
2. You'll be redirected to the login page
3. Click **"Don't have an account? Sign up"**
4. Fill in the registration form:
   - **Username**: Minimum 3 characters (required)
   - **Password**: Minimum 6 characters (required)
   - **Email**: Optional (for future password recovery)
5. Click **"Sign Up"**
6. You'll be automatically logged in and redirected to your dashboard

#### 2. Claim Your Device

Before claiming, make sure your AirGradient device has connected to the server at least once (it will auto-register as "unassigned").

1. On your dashboard, click the **"+ Claim Device"** button
2. Enter your device's serial number (e.g., `84fce612eabc`)
   - Find this on your device label or in the device configuration
3. Click **"Claim Device"**
4. If successful, the device will appear in your dashboard immediately!

#### 3. Customize Your Device

1. Once claimed, click the **"Rename"** button on your device card
2. Enter a friendly name (e.g., "Living Room Monitor", "Office Sensor")
3. Click **"Save"**
4. The custom name will display instead of the serial number

#### 4. Monitor Air Quality

Your dashboard shows real-time data for all your claimed devices:
- **PM2.5** - Particulate matter (fine particles)
- **CO2** - Carbon dioxide concentration
- **Temperature** - Current temperature
- **Humidity** - Relative humidity percentage

Devices are marked as:
- 🟢 **Active** - Data received in last 10 minutes
- 🔴 **Offline** - No data for more than 10 minutes

## Device Serial Numbers

### Where to Find Your Serial Number

Your AirGradient device serial number can be found:
1. **On the device label** - Usually printed on the back or bottom
2. **In the device web interface** - Connect to device's WiFi AP
3. **In the admin panel** (if you have admin access) - Check "Unassigned Devices"

### Serial Number Format

Serial numbers are typically:
- Hexadecimal strings (e.g., `84fce612eabc`)
- 12 characters long
- Case-insensitive (you can enter uppercase or lowercase)

## Troubleshooting

### "Device not found"

**Problem**: The error "Device not found" appears when trying to claim.

**Solutions**:
1. Make sure your device has connected to the server at least once
2. Check that you entered the correct serial number
3. Wait a few minutes and try again (device might be connecting)

### "Device is already assigned to another user"

**Problem**: The device belongs to someone else.

**Solutions**:
1. Verify you're entering the correct serial number
2. If this is your device, contact an admin to unassign it first
3. Check if you already claimed this device (it might be in your dashboard)

### Can't See My Device After Claiming

**Problem**: Claimed the device but it's not showing up.

**Solutions**:
1. Refresh the page (Ctrl+R or Cmd+R)
2. Make sure the device is powered on and connected to WiFi
3. Check that the device is configured to send data to your server URL

### Login Issues

**Problem**: Can't log in after signing up.

**Solutions**:
1. Make sure you're using the correct username and password
2. Username and password are case-sensitive
3. Try resetting your password through an admin

## Best Practices

### Security

✅ **DO**:
- Use a strong, unique password (at least 8+ characters)
- Log out when using shared computers
- Keep your device serial numbers private

❌ **DON'T**:
- Share your account credentials
- Use the same password as other services
- Leave your session logged in on public computers

### Device Management

✅ **DO**:
- Use descriptive names for your devices (location-based works well)
- Check your dashboard regularly for device status
- Claim devices immediately after setup

❌ **DON'T**:
- Claim devices that don't belong to you
- Use offensive names for devices
- Share device access credentials

## Feature Comparison: Self-Service vs Admin Management

| Feature | Self-Service | Admin Assignment |
|---------|-------------|------------------|
| Account creation | ✅ User can sign up | ❌ Admin must create |
| Device claiming | ✅ User enters serial | ❌ Admin assigns |
| Device naming | ✅ Yes | ✅ Yes |
| Access speed | ⚡ Instant | 🐌 Depends on admin |
| Admin overhead | 🎉 None | 😓 High |
| User experience | 🌟 Better | 😐 Slower |

## API Endpoints (for developers)

If you're integrating with the server:

### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure_password123",
  "email": "john@example.com"
}
```

**Response** (200 OK):
```json
{
  "id": 2,
  "username": "john_doe",
  "email": "john@example.com",
  "role": "user"
}
```

### Claim Device
```http
POST /api/devices/claim
Content-Type: application/json
Cookie: connect.sid=<session_id>

{
  "serialNumber": "84fce612eabc"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "deviceId": 5,
  "serialNumber": "84fce612eabc"
}
```

**Error Responses**:
- `400` - Missing serial number
- `404` - Device not found (never connected)
- `409` - Device already assigned to another user

## FAQ

**Q: Do I need admin approval to create an account?**  
A: No! You can sign up instantly and start using the system right away.

**Q: Can I claim multiple devices?**  
A: Yes! There's no limit to how many devices you can claim.

**Q: Can I unclaim a device?**  
A: Currently, you need to contact an admin to unassign devices. This prevents accidental removal.

**Q: What happens if I forget my password?**  
A: Contact an admin to reset your password. (Future update may include self-service password reset)

**Q: Can I transfer a device to another user?**  
A: Yes, but it requires admin assistance. They'll unassign from you and the other user can claim it.

**Q: Will admins still be able to manually add users?**  
A: Yes! Admins can still create users and assign devices through the admin panel.

## Support

If you encounter issues:

1. **Check this guide** - Most common issues are covered above
2. **Contact your admin** - They can help with device assignment issues
3. **Check server logs** - Admins can investigate technical problems
4. **Verify device connectivity** - Make sure devices are online and configured correctly

## What's Next?

After setting up your account and claiming devices:

1. **Explore the dashboard** - See real-time air quality data
2. **Set up alerts** (if available) - Get notified of poor air quality
3. **Check firmware updates** - Admins may push OTA updates
4. **Monitor trends** - Track air quality over time

Enjoy monitoring your air quality! 🌿✨
