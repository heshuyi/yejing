import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { fetchRouteTransit, type TransitInfo } from "@/lib/api";
import { formatCoords, openMapsNavigation, type TravelMode } from "@/lib/maps";

type EndpointKey = "start" | "end";

const MODES: { key: TravelMode; icon: string; title: string; subtitle: string }[] = [
  { key: "driving", icon: "车", title: "驾车", subtitle: "在系统地图中查看驾车路线" },
  { key: "transit", icon: "巴", title: "公交 + 步行", subtitle: "在系统地图中查看公共交通" },
  { key: "walking", icon: "步", title: "步行", subtitle: "在系统地图中查看步行路线" },
];

function getTarget(transit: TransitInfo, endpoint: EndpointKey) {
  return endpoint === "start" ? transit.start : transit.end;
}

export default function TransitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [transit, setTransit] = useState<TransitInfo | null>(null);
  const [endpoint, setEndpoint] = useState<EndpointKey>("start");
  const [mode, setMode] = useState<TravelMode>("driving");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    fetchRouteTransit(token, id)
      .then(setTransit)
      .catch((e) => {
        Alert.alert("无法加载", e instanceof Error ? e.message : "请稍后重试");
        setTransit(null);
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  async function onOpenMaps() {
    if (!transit) return;
    const target = getTarget(transit, endpoint);
    const coord = target.coordinate;
    if (!coord) {
      Alert.alert("缺少坐标", "请先在路线规划中设置该地点的地图位置");
      return;
    }
    const [lng, lat] = coord.coordinates;
    try {
      await openMapsNavigation(lat, lng, mode, target.place ?? transit.routeName);
    } catch {
      Alert.alert("无法打开地图", "请确认设备已安装地图应用");
    }
  }

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#0071e3" />;
  }

  if (!transit) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>无法加载到达信息</Text>
      </View>
    );
  }

  const target = getTarget(transit, endpoint);
  const coordLabel = target.coordinate
    ? formatCoords(target.coordinate.coordinates[1], target.coordinate.coordinates[0])
    : "未设置坐标";

  return (
    <>
      <Stack.Screen options={{ title: "如何到达" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>如何到达</Text>
        <Text style={styles.sub}>{transit.routeName} · 根据你的当前位置规划</Text>

        <View style={styles.toggle}>
          <Pressable
            style={[styles.tab, endpoint === "start" && styles.tabOn]}
            onPress={() => setEndpoint("start")}
          >
            <Text style={[styles.tabText, endpoint === "start" && styles.tabTextOn]}>
              徒步起点
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, endpoint === "end" && styles.tabOn]}
            onPress={() => setEndpoint("end")}
          >
            <Text style={[styles.tabText, endpoint === "end" && styles.tabTextOn]}>
              徒步终点
            </Text>
          </Pressable>
        </View>

        <View style={styles.placeCard}>
          <Text style={styles.placeLabel}>{endpoint === "start" ? "起点" : "终点"}</Text>
          <Text style={styles.placeName}>{target.place || "未命名地点"}</Text>
          <Text style={styles.coords}>{coordLabel}</Text>
          {transit.loopHint && endpoint === "end" ? (
            <Text style={styles.loopHint}>{transit.loopHint}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>交通方式</Text>
        {MODES.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.modeCard, mode === item.key && styles.modeCardOn]}
            onPress={() => setMode(item.key)}
          >
            <View style={styles.modeIcon}>
              <Text style={styles.modeIconText}>{item.icon}</Text>
            </View>
            <View style={styles.modeBody}>
              <Text style={styles.modeTitle}>{item.title}</Text>
              <Text style={styles.modeSub}>{item.subtitle}</Text>
            </View>
          </Pressable>
        ))}

        <Pressable style={styles.openBtn} onPress={onOpenMaps}>
          <Text style={styles.openBtnText}>在地图中打开导航</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#6e6e73", fontSize: 15 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  heading: { fontSize: 21, fontWeight: "600", color: "#1d1d1f" },
  sub: { fontSize: 14, color: "#6e6e73", marginTop: -8 },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f5f5f7",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabOn: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4 },
  tabText: { fontSize: 15, color: "#6e6e73", fontWeight: "600" },
  tabTextOn: { color: "#1d1d1f" },
  placeCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e8e8ed",
    backgroundColor: "#fbfbfd",
  },
  placeLabel: { fontSize: 12, color: "#6e6e73", letterSpacing: 0.5 },
  placeName: { fontSize: 21, fontWeight: "600", marginTop: 6, color: "#1d1d1f" },
  coords: { marginTop: 6, fontSize: 14, color: "#86868b", fontVariant: ["tabular-nums"] },
  loopHint: { marginTop: 8, fontSize: 13, color: "#0071e3" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#6e6e73" },
  modeCard: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d2d2d7",
    alignItems: "center",
  },
  modeCardOn: {
    borderColor: "#0071e3",
    backgroundColor: "rgba(0,113,227,0.04)",
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f5f5f7",
    alignItems: "center",
    justifyContent: "center",
  },
  modeIconText: { fontSize: 16, fontWeight: "600", color: "#0071e3" },
  modeBody: { flex: 1 },
  modeTitle: { fontSize: 16, fontWeight: "600" },
  modeSub: { marginTop: 2, fontSize: 13, color: "#6e6e73" },
  openBtn: {
    backgroundColor: "#0071e3",
    borderRadius: 980,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  openBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
