export const CAMERA_PORTS = [
  { port: 554, protocol: 'tcp', service: 'RTSP', description: 'Real Time Streaming Protocol' },
  { port: 8554, protocol: 'tcp', service: 'RTSP', description: 'RTSP alternate' },
  { port: 37777, protocol: 'tcp', service: 'Dahua', description: 'Dahua camera web' },
  { port: 8000, protocol: 'tcp', service: 'HTTP', description: 'Generic camera web interface' },
  { port: 8080, protocol: 'tcp', service: 'HTTP', description: 'Alternate web interface' },
  { port: 8443, protocol: 'tcp', service: 'HTTPS', description: 'Secure web interface' },
];

export const COMMON_PORTS = [
  { port: 21, protocol: 'tcp', service: 'FTP', description: 'File Transfer Protocol' },
  { port: 22, protocol: 'tcp', service: 'SSH', description: 'Secure Shell' },
  { port: 23, protocol: 'tcp', service: 'Telnet', description: 'Telnet (insecure)' },
  { port: 25, protocol: 'tcp', service: 'SMTP', description: 'Email sending' },
  { port: 53, protocol: 'tcp', service: 'DNS', description: 'Domain Name System' },
  { port: 80, protocol: 'tcp', service: 'HTTP', description: 'Web server' },
  { port: 110, protocol: 'tcp', service: 'POP3', description: 'Email receiving' },
  { port: 143, protocol: 'tcp', service: 'IMAP', description: 'Email accessing' },
  { port: 443, protocol: 'tcp', service: 'HTTPS', description: 'Secure web server' },
  { port: 445, protocol: 'tcp', service: 'SMB', description: 'Windows file sharing' },
  { port: 554, protocol: 'tcp', service: 'RTSP', description: 'Video streaming' },
  { port: 993, protocol: 'tcp', service: 'IMAPS', description: 'Secure IMAP' },
  { port: 995, protocol: 'tcp', service: 'POP3S', description: 'Secure POP3' },
  { port: 3306, protocol: 'tcp', service: 'MySQL', description: 'MySQL database' },
  { port: 3389, protocol: 'tcp', service: 'RDP', description: 'Remote Desktop' },
  { port: 5432, protocol: 'tcp', service: 'PostgreSQL', description: 'PostgreSQL database' },
  { port: 8080, protocol: 'tcp', service: 'HTTP-Alt', description: 'Alternate web server' },
  { port: 8443, protocol: 'tcp', service: 'HTTPS-Alt', description: 'Alternate secure web' },
  { port: 9000, protocol: 'tcp', service: 'HTTP', description: 'Foscam web interface' },
];

export const DEVICE_TYPE_PATTERNS: Record<string, string[]> = {
  camera: ['camera', 'ipcam', 'webcam', 'dvr', 'nvr', 'hikvision', 'dahua', 'foscam', 'axis', 'amcrest', 'reolink', 'nest', 'ring'],
  phone: ['iphone', 'android', 'samsung', 'huawei', 'xiaomi', 'oneplus', 'pixel'],
  laptop: ['macbook', 'thinkpad', 'dell', 'hp', 'asus', 'acer', 'lenovo'],
  tablet: ['ipad', 'android tablet', 'surface', 'galaxy tab'],
  smart_tv: ['smart tv', 'roku', 'firetv', 'apple tv', 'chromecast', 'android tv', 'tcl', 'lg tv', 'samsung tv'],
  iot_device: ['smart', 'iot', 'sensor', 'switch', 'bulb', 'plug', 'thermostat', 'lock', 'camera', 'doorbell'],
  router: ['router', 'gateway', 'access point', 'netgear', 'tp-link', 'linksys', 'cisco', 'asus router', 'ubiquiti'],
};

export const THREAT_REASONS: Record<string, string> = {
  camera_detected: 'Camera device detected on network',
  open_rtsp: 'RTSP stream accessible',
  open_camera_web: 'Camera web interface exposed',
  no_auth_camera: 'Camera accessible without authentication',
  suspicious_port: 'Suspicious port detected',
  unknown_device: 'Unknown device on network',
  many_open_ports: 'Multiple open ports detected',
  weak_security: 'Network has weak security (open/WEP)',
};

export const RISK_THRESHOLDS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 5,
};

export const API_ENDPOINTS = {
  AUTH_TOKEN: '/v1/auth/token',
  NETWORK_CHECK: '/v1/networks/check',
  NETWORK_REPORT: '/v1/networks/report',
  ALERTS_NEARBY: '/v1/alerts/nearby',
  HEALTH: '/v1/health',
};

export const RATE_LIMITS = {
  CHECK_NETWORK: { requests: 60, window: 60000 },
  REPORT_NETWORK: { requests: 10, window: 3600000 },
  GET_TOKEN: { requests: 5, window: 3600000 },
};
