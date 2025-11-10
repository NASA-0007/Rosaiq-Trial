# AirGradient Device Setup for Custom Server

## Problem Identified

Your AirGradient device was trying to get firmware updates from the AirGradient cloud server (`hw.airgradient.com`) instead of your custom server. The device needs to be configured to use your server for OTA updates.

## Solution

The device queries the `/config` endpoint to get the `httpDomain` configuration, which tells it which server to use for OTA updates. I've added this endpoint to your server.

## How AirGradient OTA Works

1. **Device boots up** → Queries `/config` endpoint to get configuration
2. **Server responds** with `httpDomain` pointing to your custom server
3. **Device stores this** and uses it for OTA updates
4. **When checking for updates** → Device requests `/sensors/{deviceId}/generic/os/firmware.bin?current_firmware={version}`
5. **Server responds:**
   - `304` if device is already up-to-date (with explanation text)
   - `400` with empty payload for unknown/dev versions (snapshot, local)
   - `200` with binary data if update is available

## Device Configuration Options

### Option 1: Configure via Local Server API (Recommended)

Send a PUT request to your AirGradient device's local server to set the `httpDomain`:

```bash
# Replace 'airgradient_XXXXXXXXX.local' with your device's mDNS name
# Replace 'your-server.onrender.com' with your actual Render server URL

curl -X PUT -H "Content-Type: application/json" \
  -d '{"httpDomain":"https://your-server.onrender.com"}' \
  http://airgradient_XXXXXXXXX.local/config
```

### Option 2: Configure via Dashboard

1. Go to [AirGradient Dashboard](https://app.airgradient.com/)
2. Select your device
3. Go to Settings → Advanced
4. Set "Configuration Control" to `local` (this prevents cloud from overriding your settings)
5. Set "Custom Server Domain" to your Render URL

### Option 3: Configure via WiFi Setup

1. Press the factory reset button on your AirGradient device for 5 seconds (don't hold too long or it will factory reset)
2. Connect to the WiFi hotspot "AirGradient-XXXXXX"
3. In the configuration page, set:
   - **Cloud Connection**: Disable
   - **Local Server**: Enable
   - **Server Domain**: `https://your-server.onrender.com`

## Verifying Configuration

### Check if Device is Using Your Server

1. Watch Render logs when device boots
2. You should see:
```
[CONFIG] Device requesting configuration
[CONFIG] Responding with httpDomain: https://your-server.onrender.com
```

3. Then when device checks for updates:
```
[OTA] Request received: /sensors/rosaiq:XXXXXX/generic/os/firmware.bin?current_firmware=X.X.X
[OTA] Device: rosaiq:XXXXXX, Current version: X.X.X
```

### Check Device's Local Server

Query your device's `/config` endpoint:

```bash
curl http://airgradient_XXXXXXXXX.local/config
```

Look for `"httpDomain"` in the response - it should be your server URL.

## Important Notes

1. **Device ID Format**: Your device ID is `rosaiq:<serial>` with a colon. The server now handles this correctly.

2. **HTTPS Required**: When deployed on Render, your device must use HTTPS (not HTTP) to communicate with the server.

3. **Configuration Persistence**: The device stores the `httpDomain` configuration, so you only need to set it once.

4. **Firmware Versions**: 
   - Upload firmware with version numbers like `3.1.4`, `3.2.0`, etc.
   - Device will compare its current version with the latest on your server
   - Versions like "snapshot", "dev", or "local" will return a 400 response (device won't update)

## Current Server Status

✅ `/config` endpoint - Returns httpDomain configuration
✅ `/sensors/:deviceId/generic/os/firmware.bin` - OTA firmware delivery
✅ Extensive logging for debugging
✅ Handles device ID with colon (rosaiq:serial)

## Troubleshooting

### Device Still Using AirGradient Cloud
- Check if `configurationControl` is set to `cloud` on the AirGradient dashboard
- Set it to `local` or `both` to allow local server configuration

### OTA Not Working
1. Check Render logs for `/config` requests - device should query this first
2. Check if `httpDomain` in response matches your server URL
3. Check OTA logs show correct device ID and version
4. Verify firmware file exists in `/firmware` directory and database

### 301 Redirects
- Render automatically redirects HTTP → HTTPS
- Make sure device is using `https://` not `http://`
- Check if device supports HTTPS (firmware 3.1.0+)

## Next Steps

1. **Configure your device** using one of the options above
2. **Restart the device** to make it query the new `/config` endpoint
3. **Check Render logs** to see if device is hitting your server
4. **Upload a firmware** version in the admin panel
5. **Trigger OTA update** by restarting device or waiting for automatic check

## Example Commands

### Set httpDomain via device local server
```bash
# Find your device's mDNS name (usually airgradient_SERIALNUMBER.local)
# Then configure it:
curl -X PUT -H "Content-Type: application/json" \
  -d '{"httpDomain":"https://your-server.onrender.com"}' \
  http://airgradient_ecda3b1eaaaf.local/config
```

### Check device configuration
```bash
curl http://airgradient_ecda3b1eaaaf.local/config | jq
```

### Monitor OTA updates in Render logs
```bash
# Look for these log entries:
[CONFIG] Device requesting configuration
[OTA] Request received
[OTA] ✓ Sending firmware X.X.X to rosaiq:XXXXXX
```
