import { StyleSheet, Text, View } from "react-native";

import { MARKER_TYPE_COLOR } from "@/constants/markers";
import type { GeoPoint, Marker, MarkerType } from "@/lib/api";

interface RouteMapPreviewProps {
  coordinates: [number, number][];
  markers: Pick<Marker, "type" | "coordinate" | "name">[];
  height?: number;
}

function projectPoints(
  coords: [number, number][],
  width: number,
  height: number,
): { x: number; y: number }[] {
  if (coords.length === 0) return [];
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const padLng = Math.max((maxLng - minLng) * 0.1, 0.0005);
  const padLat = Math.max((maxLat - minLat) * 0.1, 0.0005);

  return coords.map(([lng, lat]) => ({
    x: ((lng - minLng + padLng) / (maxLng - minLng + padLng * 2)) * width,
    y: height - ((lat - minLat + padLat) / (maxLat - minLat + padLat * 2)) * height,
  }));
}

function projectPoint(
  coord: GeoPoint,
  allCoords: [number, number][],
  width: number,
  height: number,
): { x: number; y: number } {
  const combined = [...allCoords, coord.coordinates];
  const [p] = projectPoints(combined, width, height).slice(-1);
  return p ?? { x: width / 2, y: height / 2 };
}

export function RouteMapPreview({
  coordinates,
  markers,
  height = 280,
}: RouteMapPreviewProps) {
  const width = 360;
  const points = projectPoints(coordinates, width, height);

  return (
    <View style={[styles.map, { height }]}>
      {coordinates.length === 0 ? (
        <Text style={styles.empty}>暂无轨迹数据</Text>
      ) : (
        <>
          {points.map((p, i) =>
            i === 0 ? null : (
              <View
                key={`seg-${i}`}
                style={[
                  styles.segment,
                  {
                    left: points[i - 1].x,
                    top: points[i - 1].y,
                    width: Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y),
                    transform: [
                      {
                        rotate: `${Math.atan2(
                          p.y - points[i - 1].y,
                          p.x - points[i - 1].x,
                        )}rad`,
                      },
                    ],
                  },
                ]}
              />
            ),
          )}
          {markers.map((m, i) => {
            const pos = projectPoint(m.coordinate, coordinates, width, height);
            const color = MARKER_TYPE_COLOR[m.type as MarkerType] ?? "#86868b";
            return (
              <View
                key={`${m.name}-${i}`}
                style={[styles.pin, { left: pos.x - 6, top: pos.y - 6, backgroundColor: color }]}
              />
            );
          })}
          <Text style={styles.caption}>
            {coordinates.length} 轨迹点 · {markers.length} 标记
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: "#5a7356",
    overflow: "hidden",
    position: "relative",
  },
  empty: { color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 120 },
  segment: {
    position: "absolute",
    height: 3,
    backgroundColor: "#0071e3",
    transformOrigin: "left center",
  },
  pin: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  caption: {
    position: "absolute",
    bottom: 10,
    left: 12,
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
});
