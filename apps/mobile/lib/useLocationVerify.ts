import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

interface VerifyResult {
  verified: boolean;
  distance: number | null; // meters
  coords: { latitude: number; longitude: number } | null;
  error: string | null;
}

export function useLocationVerify() {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verify = useCallback(async (storeLat: number, storeLng: number, maxDistanceM = 200) => {
    setVerifying(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setResult({ verified: false, distance: null, coords: null, error: 'Location permission denied' });
        return false;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;

      // Haversine distance
      const R = 6371000;
      const φ1 = (storeLat * Math.PI) / 180;
      const φ2 = (latitude * Math.PI) / 180;
      const Δφ = ((latitude - storeLat) * Math.PI) / 180;
      const Δλ = ((longitude - storeLng) * Math.PI) / 180;
      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

      const verified = distance <= maxDistanceM;
      setResult({ verified, distance, coords: { latitude, longitude }, error: null });
      return verified;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Location error';
      setResult({ verified: false, distance: null, coords: null, error: msg });
      return false;
    } finally {
      setVerifying(false);
    }
  }, []);

  return { verify, verifying, result };
}
