import { useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

const BASE = { lng: 120.15, lat: 30.25 };
const SPAN = { lng: 0.08, lat: 0.06 };

export function defaultStartPoint(): GeoPoint {
  return { type: "Point", coordinates: [120.12, 30.22] };
}

export function defaultEndPoint(): GeoPoint {
  return { type: "Point", coordinates: [120.18, 30.28] };
}

function coordToOffset(
  coord: GeoPoint,
  width: number,
  height: number,
): { left: number; top: number } {
  const [lng, lat] = coord.coordinates;
  const left = ((lng - BASE.lng) / SPAN.lng + 0.5) * width;
  const top = (0.5 - (lat - BASE.lat) / SPAN.lat) * height;
  return { left: Math.max(8, Math.min(width - 48, left)), top: Math.max(8, Math.min(height - 28, top)) };
}

function offsetToCoord(
  x: number,
  y: number,
  width: number,
  height: number,
): GeoPoint {
  const lng = BASE.lng + ((x / width) - 0.5) * SPAN.lng;
  const lat = BASE.lat + (0.5 - y / height) * SPAN.lat;
  return { type: "Point", coordinates: [lng, lat] };
}

type ActivePin = "start" | "end";

interface MapPickPlaceholderProps {
  startCoordinate: GeoPoint;
  endCoordinate: GeoPoint;
  onChange: (next: { startCoordinate?: GeoPoint; endCoordinate?: GeoPoint }) => void;
}

export function MapPickPlaceholder({
  startCoordinate,
  endCoordinate,
  onChange,
}: MapPickPlaceholderProps) {
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [activePin, setActivePin] = useState<ActivePin>("start");

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }

  function onMapPress(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent;
    const coord = offsetToCoord(locationX, locationY, size.width, size.height);
    if (activePin === "start") {
      onChange({ startCoordinate: coord });
    } else {
      onChange({ endCoordinate: coord });
    }
  }

  const startPos = coordToOffset(startCoordinate, size.width, size.height);
  const endPos = coordToOffset(endCoordinate, size.width, size.height);

  return (
    <View>
      <View style={styles.pinRow}>
        <Pressable
          style={[styles.pinTab, activePin === "start" && styles.pinTabOn]}
          onPress={() => setActivePin("start")}
        >
          <Text style={[styles.pinTabText, activePin === "start" && styles.pinTabTextOn]}>
            设起点
          </Text>
        </Pressable>
        <Pressable
          style={[styles.pinTab, activePin === "end" && styles.pinTabOn]}
          onPress={() => setActivePin("end")}
        >
          <Text style={[styles.pinTabText, activePin === "end" && styles.pinTabTextOn]}>
            设终点
          </Text>
        </Pressable>
      </View>
      <Pressable style={styles.map} onLayout={onLayout} onPress={onMapPress}>
        <View style={[styles.marker, styles.markerStart, { left: startPos.left, top: startPos.top }]}>
          <Text style={styles.markerText}>起点</Text>
        </View>
        <View style={[styles.marker, styles.markerEnd, { left: endPos.left, top: endPos.top }]}>
          <Text style={styles.markerText}>终点</Text>
        </View>
      </Pressable>
      <Text style={styles.hint}>点击地图设置起点与终点 · 支持环线（终点=起点）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pinRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  pinTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: "#d2d2d7",
  },
  pinTabOn: { borderColor: "#0071e3", backgroundColor: "rgba(0,113,227,0.06)" },
  pinTabText: { fontSize: 13, color: "#6e6e73" },
  pinTabTextOn: { color: "#0071e3", fontWeight: "600" },
  map: {
    height: 200,
    borderRadius: 18,
    backgroundColor: "#5a7356",
    overflow: "hidden",
    position: "relative",
  },
  marker: {
    position: "absolute",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 980,
  },
  markerStart: { backgroundColor: "#16a34a" },
  markerEnd: { backgroundColor: "#0071e3" },
  markerText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  hint: { marginTop: 8, fontSize: 14, color: "#6e6e73" },
});
