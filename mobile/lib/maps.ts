import { Linking, Platform } from "react-native";

export type TravelMode = "driving" | "transit" | "walking";

const APPLE_DIR: Record<TravelMode, string> = {
  driving: "d",
  transit: "r",
  walking: "w",
};

const GOOGLE_MODE: Record<TravelMode, string> = {
  driving: "driving",
  transit: "transit",
  walking: "walking",
};

export function formatCoords(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"} · ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? "E" : "W"}`;
}

export async function openMapsNavigation(
  lat: number,
  lng: number,
  mode: TravelMode,
  label?: string,
): Promise<void> {
  const name = label ? encodeURIComponent(label) : undefined;
  const apple = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=${APPLE_DIR[mode]}`;
  const google = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${GOOGLE_MODE[mode]}`;

  if (Platform.OS === "ios") {
    const mapsScheme = `maps://?daddr=${lat},${lng}&dirflg=${APPLE_DIR[mode]}`;
    const canMaps = await Linking.canOpenURL(mapsScheme);
    await Linking.openURL(canMaps ? mapsScheme : apple);
    return;
  }

  await Linking.openURL(google);
}
