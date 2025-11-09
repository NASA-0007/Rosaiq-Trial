/**
 * RosaIQ Air Quality Dashboard - Frontend Application
 */

// Global state
let devices = [];
let selectedDeviceId = null;
let charts = {};
let autoRefreshInterval = null;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('RosaIQ Dashboard initialized');
    loadDashboard();
    startAutoRefresh();
});

/**
 * Load dashboard data
 */
async function loadDashboard() {
    try {
        await Promise.all([
            loadSummary(),
            loadDevices()
        ]);
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

/**
 * Load summary statistics
 */
async function loadSummary() {
    try {
        const response = await fetch('/api/dashboard/summary');
        const data = await response.json();

        document.getElementById('totalDevices').textContent = data.totalDevices;
        document.getElementById('activeDevices').textContent = data.activeDevices;
        document.getElementById('avgCO2').textContent = data.averages.co2 || '-';
        document.getElementById('avgPM25').textContent = data.averages.pm25 || '-';
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

/**
 * Load all devices
 */
async function loadDevices() {
    try {
        const response = await fetch('/api/devices');
        devices = await response.json();

        renderDevices();
    } catch (error) {
        console.error('Error loading devices:', error);
        document.getElementById('devicesContainer').innerHTML = 
            '<div class="loading">Error loading devices</div>';
    }
}

/**
 * Render devices grid
 */
function renderDevices() {
    const container = document.getElementById('devicesContainer');

    if (devices.length === 0) {
        container.innerHTML = `
            <div class="loading">
                No devices connected yet. Waiting for devices to connect...
            </div>
        `;
        return;
    }

    container.innerHTML = devices.map(device => {
        const isOnline = isDeviceOnline(device.last_seen);
        const m = device.latestMeasurement || {};

        return `
            <div class="device-card ${isOnline ? '' : 'offline'}" onclick="openDeviceModal('${device.device_id}')">
                <div class="device-header">
                    <div class="device-title">
                        <h3>${device.name || device.serial_number}</h3>
                        <div class="device-id">${device.device_id}</div>
                        ${device.location ? `<div class="text-muted mt-1">${device.location}</div>` : ''}
                    </div>
                    <span class="device-status ${isOnline ? 'online' : 'offline'}">
                        ${isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>

                <div class="device-metrics">
                    <div class="metric ${getCO2Class(m.rco2)}">
                        <div class="metric-label">CO₂</div>
                        <div class="metric-value">${m.rco2 || '-'} <span style="font-size: 0.7rem;">ppm</span></div>
                    </div>

                    <div class="metric ${getPM25Class(m.pm02)}">
                        <div class="metric-label">PM2.5</div>
                        <div class="metric-value">${m.pm02 || '-'} <span style="font-size: 0.7rem;">µg/m³</span></div>
                    </div>

                    <div class="metric">
                        <div class="metric-label">Temperature</div>
                        <div class="metric-value">${m.atmp ? m.atmp.toFixed(1) : '-'}°<span style="font-size: 0.7rem;">C</span></div>
                    </div>

                    <div class="metric">
                        <div class="metric-label">Humidity</div>
                        <div class="metric-value">${m.rhum || '-'}<span style="font-size: 0.7rem;">%</span></div>
                    </div>
                </div>

                <div class="text-muted text-center mt-2" style="font-size: 0.8rem;">
                    Last seen: ${formatTimestamp(device.last_seen)}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Open device detail modal
 */
async function openDeviceModal(deviceId) {
    selectedDeviceId = deviceId;
    const device = devices.find(d => d.device_id === deviceId);

    if (!device) return;

    document.getElementById('modalDeviceName').textContent = device.name || device.serial_number;
    document.getElementById('deviceModal').classList.add('active');

    // Load device details
    await loadDeviceMeasurements(deviceId);
    await loadDeviceCharts(deviceId);
    await loadDeviceConfig(deviceId);
    loadDeviceInfo(device);
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('deviceModal').classList.remove('active');
    selectedDeviceId = null;
    
    // Destroy charts
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
}

/**
 * Switch tab
 */
function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
}

/**
 * Load device measurements
 */
async function loadDeviceMeasurements(deviceId) {
    try {
        const response = await fetch(`/api/devices/${deviceId}`);
        const device = await response.json();
        const m = device.latestMeasurement || {};

        const measurements = [
            { label: 'CO₂', value: m.rco2, unit: 'ppm', class: getCO2Class(m.rco2) },
            { label: 'PM1.0', value: m.pm01, unit: 'µg/m³', class: 'good' },
            { label: 'PM2.5', value: m.pm02, unit: 'µg/m³', class: getPM25Class(m.pm02) },
            { label: 'PM10', value: m.pm10, unit: 'µg/m³', class: 'good' },
            { label: 'Temperature', value: m.atmp ? m.atmp.toFixed(1) : null, unit: '°C', class: 'good' },
            { label: 'Humidity', value: m.rhum, unit: '%', class: 'good' },
            { label: 'TVOC Index', value: m.tvoc_index, unit: '', class: 'good' },
            { label: 'NOx Index', value: m.nox_index, unit: '', class: 'good' },
            { label: 'WiFi Signal', value: m.wifi_rssi, unit: 'dBm', class: 'good' },
        ];

        document.getElementById('measurementsGrid').innerHTML = measurements.map(m => `
            <div class="measurement-item ${m.class}">
                <div class="measurement-label">${m.label}</div>
                <div>
                    <span class="measurement-value">${m.value || '-'}</span>
                    <span class="measurement-unit">${m.unit}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading measurements:', error);
    }
}

/**
 * Load device charts
 */
async function loadDeviceCharts(deviceId) {
    try {
        const response = await fetch(`/api/devices/${deviceId}/measurements?limit=50`);
        const measurements = await response.json();

        if (measurements.length === 0) {
            document.getElementById('chartsTab').innerHTML = 
                '<div class="loading">No historical data available yet</div>';
            return;
        }

        // Prepare data (reverse to show oldest first)
        measurements.reverse();
        const labels = measurements.map(m => formatTime(m.timestamp));
        const co2Data = measurements.map(m => m.rco2);
        const pm25Data = measurements.map(m => m.pm02);
        const tempData = measurements.map(m => m.atmp);
        const humData = measurements.map(m => m.rhum);

        // CO2 Chart
        const co2Ctx = document.getElementById('co2Chart').getContext('2d');
        if (charts.co2) charts.co2.destroy();
        charts.co2 = new Chart(co2Ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'CO₂ (ppm)',
                    data: co2Data,
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                }]
            },
            options: getChartOptions('CO₂ Levels (ppm)')
        });

        // PM2.5 Chart
        const pm25Ctx = document.getElementById('pm25Chart').getContext('2d');
        if (charts.pm25) charts.pm25.destroy();
        charts.pm25 = new Chart(pm25Ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'PM2.5 (µg/m³)',
                    data: pm25Data,
                    borderColor: 'rgb(245, 158, 11)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                }]
            },
            options: getChartOptions('PM2.5 Levels (µg/m³)')
        });

        // Temperature & Humidity Chart
        const tempHumCtx = document.getElementById('tempHumChart').getContext('2d');
        if (charts.tempHum) charts.tempHum.destroy();
        charts.tempHum = new Chart(tempHumCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: tempData,
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y',
                    },
                    {
                        label: 'Humidity (%)',
                        data: humData,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1',
                    }
                ]
            },
            options: {
                ...getChartOptions('Temperature & Humidity'),
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Humidity (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                }
            }
        });
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

/**
 * Load device configuration
 */
async function loadDeviceConfig(deviceId) {
    try {
        const response = await fetch(`/api/devices/${deviceId}/config`);
        const config = await response.json();

        document.getElementById('configForm').innerHTML = `
            <div class="form-group">
                <label>LED Bar Mode</label>
                <select id="ledBarMode">
                    <option value="co2" ${config.led_bar_mode === 'co2' ? 'selected' : ''}>CO₂</option>
                    <option value="pm" ${config.led_bar_mode === 'pm' ? 'selected' : ''}>PM</option>
                    <option value="off" ${config.led_bar_mode === 'off' ? 'selected' : ''}>Off</option>
                </select>
            </div>

            <div class="form-group">
                <label>Temperature Unit</label>
                <select id="temperatureUnit">
                    <option value="c" ${config.temperature_unit === 'c' ? 'selected' : ''}>Celsius (°C)</option>
                    <option value="f" ${config.temperature_unit === 'f' ? 'selected' : ''}>Fahrenheit (°F)</option>
                </select>
            </div>

            <div class="form-group">
                <label>LED Bar Brightness (%)</label>
                <input type="number" id="ledBarBrightness" min="0" max="100" value="${config.led_bar_brightness}">
            </div>

            <div class="form-group">
                <label>Display Brightness (%)</label>
                <input type="number" id="displayBrightness" min="0" max="100" value="${config.display_brightness}">
            </div>

            <div class="form-group">
                <label>CO₂ ABC Days</label>
                <input type="number" id="abcDays" min="0" max="200" value="${config.abc_days}">
            </div>

            <div class="form-group">
                <label>PM Standard</label>
                <select id="pmStandard">
                    <option value="ugm3" ${config.pm_standard === 'ugm3' ? 'selected' : ''}>µg/m³</option>
                    <option value="us-aqi" ${config.pm_standard === 'us-aqi' ? 'selected' : ''}>US AQI</option>
                </select>
            </div>
        `;
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

/**
 * Save device configuration
 */
async function saveConfig() {
    if (!selectedDeviceId) return;

    const config = {
        ledBarMode: document.getElementById('ledBarMode').value,
        temperatureUnit: document.getElementById('temperatureUnit').value,
        ledBarBrightness: parseInt(document.getElementById('ledBarBrightness').value),
        displayBrightness: parseInt(document.getElementById('displayBrightness').value),
        abcDays: parseInt(document.getElementById('abcDays').value),
        pmStandard: document.getElementById('pmStandard').value,
    };

    try {
        const response = await fetch(`/api/devices/${selectedDeviceId}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            alert('Configuration saved successfully! Device will apply changes on next sync.');
        } else {
            alert('Failed to save configuration');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        alert('Error saving configuration');
    }
}

/**
 * Load device info
 */
function loadDeviceInfo(device) {
    const info = [
        { label: 'Device ID', value: device.device_id },
        { label: 'Serial Number', value: device.serial_number },
        { label: 'Model', value: device.model || 'Unknown' },
        { label: 'Firmware', value: device.firmware_version || 'Unknown' },
        { label: 'Status', value: isDeviceOnline(device.last_seen) ? 'Online' : 'Offline' },
        { label: 'First Seen', value: formatTimestamp(device.first_seen) },
        { label: 'Last Seen', value: formatTimestamp(device.last_seen) },
        { label: 'Total Measurements', value: device.stats?.total_measurements || 0 },
    ];

    document.getElementById('deviceInfo').innerHTML = info.map(i => `
        <div class="info-row">
            <div class="info-label">${i.label}</div>
            <div class="info-value">${i.value}</div>
        </div>
    `).join('');
}

/**
 * Refresh dashboard data
 */
async function refreshData() {
    console.log('Refreshing data...');
    await loadDashboard();
}

/**
 * Start auto-refresh
 */
function startAutoRefresh() {
    // Refresh every 30 seconds
    autoRefreshInterval = setInterval(() => {
        refreshData();
    }, 30000);
}

/**
 * Update last update time
 */
function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

// ============================================================================
// Utility Functions
// ============================================================================

function isDeviceOnline(lastSeen) {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now - lastSeenDate) / (1000 * 60);
    return diffMinutes < 2; // Consider online if seen in last 2 minutes
}

function getCO2Class(co2) {
    if (!co2) return '';
    if (co2 < 800) return 'good';
    if (co2 < 1200) return 'moderate';
    return 'bad';
}

function getPM25Class(pm25) {
    if (!pm25) return '';
    if (pm25 < 12) return 'good';
    if (pm25 < 35) return 'moderate';
    return 'bad';
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function getChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            title: {
                display: true,
                text: title,
                font: {
                    size: 16,
                    weight: 'bold'
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false
            }
        }
    };
}

function showError(message) {
    console.error(message);
    // Could add toast notification here
}

// Close modal when clicking outside
document.getElementById('deviceModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'deviceModal') {
        closeModal();
    }
});
