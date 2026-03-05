import type { DeviceType, Port } from '@shared/src/types/device';
import { DEVICE_TYPE_PATTERNS } from '@shared/src/constants';

export function classifyDevice(
  mac: string,
  vendor?: string,
  hostname?: string,
  openPorts?: Port[]
): DeviceType {
  const searchText = [
    vendor,
    hostname,
    ...(openPorts?.map(p => p.service) || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [deviceType, patterns] of Object.entries(DEVICE_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (searchText.includes(pattern.toLowerCase())) {
        return deviceType as DeviceType;
      }
    }
  }

  if (openPorts) {
    if (openPorts.some(p => p.number === 554 || p.number === 8554)) {
      return 'camera';
    }
    if (openPorts.some(p => p.number === 80 || p.number === 443 || p.number === 8080)) {
      if (vendor && isKnownCameraVendor(vendor)) {
        return 'camera';
      }
    }
  }

  if (vendor) {
    if (isKnownRouterVendor(vendor)) {
      return 'router';
    }
    if (isKnownCameraVendor(vendor)) {
      return 'camera';
    }
  }

  if (hostname) {
    const hostnameLower = hostname.toLowerCase();
    if (hostnameLower.includes('router') || hostnameLower.includes('gateway')) {
      return 'router';
    }
  }

  return 'unknown';
}

function isKnownCameraVendor(vendor: string): boolean {
  const cameraVendors = [
    'hikvision',
    'dahua',
    'foscam',
    'amcrest',
    'reolink',
    'axis',
    'bosch',
    'panasonic',
    'honeywell',
    'nest',
    'ring',
    'arlo',
    'logitech',
    'netatmo',
    ' Canary',
    'dropcam',
    'logitech',
    'yi',
    'xiaomi',
    'ezviz',
    'tplink',
    'tapo',
  ];
  
  const vendorLower = vendor.toLowerCase();
  return cameraVendors.some(v => vendorLower.includes(v));
}

function isKnownRouterVendor(vendor: string): boolean {
  const routerVendors = [
    'cisco',
    'linksys',
    'netgear',
    'tp-link',
    'd-link',
    'asus',
    'ubiquiti',
    'mikrotik',
    'arris',
    'netcomm',
    'technicolor',
    'sagemcom',
    'thomson',
    'huawei',
    'zyxel',
    'buffalo',
    'trendnet',
    'linksys',
    'belkin',
    'tenda',
  ];
  
  const vendorLower = vendor.toLowerCase();
  return routerVendors.some(v => vendorLower.includes(v));
}
