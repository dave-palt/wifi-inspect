export function hashBssid(bssid: string): string {
  // Simple hash function for BSSID
  // In production, use a proper crypto library
  let hash = 0;
  const str = bssid.replace(/[:-]/g, '').toLowerCase();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Convert to hex and pad
  let result = Math.abs(hash).toString(16);
  while (result.length < 16) {
    result = '0' + result;
  }
  return result.substring(0, 16);
}

export function generateGeohash(latitude: number, longitude: number, precision: number = 6): string {
  // Simplified geohash implementation
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let geohash = '';
  let minLat = -90, maxLat = 90;
  let minLon = -180, maxLon = 180;
  let isLon = true;
  let bit = 0;
  let ch = 0;
  
  while (geohash.length < precision) {
    const val = isLon 
      ? (longitude >= (minLon + maxLon) / 2 ? 1 : 0)
      : (latitude >= (minLat + maxLat) / 2 ? 1 : 0);
    
    ch = (ch << 1) | val;
    bit++;
    
    if (bit === 5) {
      geohash += base32[ch];
      bit = 0;
      ch = 0;
    }
    
    if (isLon) {
      if (val) minLon = (minLon + maxLon) / 2;
      else maxLon = (minLon + maxLon) / 2;
    } else {
      if (val) minLat = (minLat + maxLat) / 2;
      else maxLat = (minLat + maxLat) / 2;
    }
    
    isLon = !isLon;
  }
  
  return geohash;
}
