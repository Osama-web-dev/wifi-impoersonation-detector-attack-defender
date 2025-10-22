from flask import Flask, render_template, jsonify
import subprocess
import re
import json
import platform
from threading import Lock

app = Flask(__name__)
lock = Lock()

def get_wifi_networks_windows():
    """Get Wi-Fi networks on Windows systems"""
    try:
        # Run netsh command to get Wi-Fi profiles
        result = subprocess.run(['netsh', 'wlan', 'show', 'networks', 'mode=bssid'], 
                              capture_output=True, text=True, timeout=30)
        
        networks = []
        current_ssid = None
        current_bssid = None
        current_signal = None
        current_channel = None
        
        for line in result.stdout.split('\n'):
            line = line.strip()
            
            # SSID line
            if line.startswith('SSID'):
                parts = line.split(':', 1)
                if len(parts) > 1:
                    current_ssid = parts[1].strip()
            
            # BSSID line
            elif 'BSSID' in line:
                parts = line.split(':', 1)
                if len(parts) > 1:
                    current_bssid = parts[1].strip()
            
            # Signal strength line
            elif 'Signal' in line:
                parts = line.split(':', 1)
                if len(parts) > 1:
                    signal_str = parts[1].strip().replace('%', '')
                    try:
                        current_signal = int(signal_str)
                    except ValueError:
                        current_signal = 0
            
            # Channel line
            elif 'Channel' in line:
                parts = line.split(':', 1)
                if len(parts) > 1:
                    channel_str = parts[1].strip()
                    try:
                        current_channel = int(channel_str)
                    except ValueError:
                        current_channel = 0
            
            # When we hit a new network or the end of the current one
            if current_ssid and current_bssid and current_signal is not None:
                # Check if we already have this BSSID
                if not any(n['mac'] == current_bssid for n in networks):
                    networks.append({
                        'ssid': current_ssid,
                        'mac': current_bssid,
                        'signal': current_signal,
                        'channel': current_channel or 1,
                        'security': 'Unknown',  # netsh doesn't provide this easily
                        'vendor': 'Unknown',
                        'status': 'safe'
                    })
                
                # Reset for next AP
                current_bssid = None
                current_signal = None
                current_channel = None
        
        return networks
    
    except Exception as e:
        print(f"Error scanning Wi-Fi: {e}")
        return []

def get_wifi_networks_linux():
    """Get Wi-Fi networks on Linux systems"""
    try:
        # Try using nmcli first
        result = subprocess.run(['nmcli', '-t', '-f', 'SSID,BSSID,SIGNAL,CHAN,SECURITY', 'dev', 'wifi'], 
                              capture_output=True, text=True, timeout=30)
        
        networks = []
        
        for line in result.stdout.split('\n'):
            if not line:
                continue
                
            parts = line.split(':')
            if len(parts) >= 5:
                ssid, bssid, signal, channel, security = parts[0], parts[1], parts[2], parts[3], parts[4]
                
                try:
                    signal_int = int(signal)
                except ValueError:
                    signal_int = 0
                    
                try:
                    channel_int = int(channel)
                except ValueError:
                    channel_int = 1
                
                # Determine vendor from MAC address (first 3 octets)
                vendor = "Unknown"
                mac_prefix = bssid.upper().replace(':', '')[:6]
                # You could add a MAC vendor database lookup here
                
                networks.append({
                    'ssid': ssid,
                    'mac': bssid,
                    'signal': signal_int,
                    'channel': channel_int,
                    'security': security,
                    'vendor': vendor,
                    'status': 'safe'
                })
        
        return networks
    
    except Exception as e:
        print(f"Error scanning Wi-Fi with nmcli: {e}")
        return []

def get_wifi_networks():
    """Get Wi-Fi networks based on the current OS"""
    system = platform.system()
    
    if system == "Windows":
        return get_wifi_networks_windows()
    elif system == "Linux":
        return get_wifi_networks_linux()
    else:
        # macOS or other - not implemented
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scan')
def scan_networks():
    with lock:
        networks = get_wifi_networks()
        
        # If we couldn't get real networks, return some sample data
        if not networks:
            networks = [
                {
                    "ssid": "CafeFreeWiFi",
                    "mac": "A4:56:02:3F:8C:71",
                    "signal": 85,
                    "security": "WPA2",
                    "vendor": "Cisco",
                    "status": "safe",
                    "channel": 6
                },
                {
                    "ssid": "Airport_Guest",
                    "mac": "B8:27:EB:D5:A1:9C",
                    "signal": 72,
                    "security": "Open",
                    "vendor": "TP-Link",
                    "status": "safe",
                    "channel": 11
                },
                {
                    "ssid": "Library_Public",
                    "mac": "9C:5C:8E:12:F3:A7",
                    "signal": 65,
                    "security": "WPA2",
                    "vendor": "Netgear",
                    "status": "safe",
                    "channel": 1
                }
            ]
        
        return jsonify(networks)

@app.route('/api/simulate_attack')
def simulate_attack():
    with lock:
        networks = get_wifi_networks()
        
        # If we couldn't get real networks, use sample data
        if not networks:
            networks = [
                {
                    "ssid": "CafeFreeWiFi",
                    "mac": "A4:56:02:3F:8C:71",
                    "signal": 85,
                    "security": "WPA2",
                    "vendor": "Cisco",
                    "status": "safe",
                    "channel": 6
                },
                {
                    "ssid": "Airport_Guest",
                    "mac": "B8:27:EB:D5:A1:9C",
                    "signal": 72,
                    "security": "Open",
                    "vendor": "TP-Link",
                    "status": "safe",
                    "channel": 11
                }
            ]
        
        # Add evil twin networks
        evil_twin_networks = [
            {
                "ssid": "CafeFreeWiFi",
                "mac": "00:0C:42:1F:AB:39",
                "signal": 95,
                "security": "Open",
                "vendor": "Unknown",
                "status": "danger",
                "reason": "Duplicate SSID with different MAC and unusually high signal strength",
                "channel": 6
            },
            {
                "ssid": "Airport_Guest",
                "mac": "A4:56:02:AA:BB:CC",
                "signal": 68,
                "security": "WEP",
                "vendor": "Mismatch",
                "status": "warning",
                "reason": "SSID matches known network but security protocol is weaker than expected",
                "channel": 11
            }
        ]
        
        return jsonify(networks + evil_twin_networks)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)