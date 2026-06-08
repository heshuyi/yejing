import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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

import { RouteMapPreview } from "@/components/RouteMapPreview";
import { MARKER_TYPE_LABEL } from "@/constants/markers";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteRoute,
  fetchRouteDetail,
  type Marker,
  type RouteDetail,
} from "@/lib/api";
import { formatDuration } from "@/lib/recordingMetrics";

const STATUS_LABEL = {
  active: "进行中",
  completed: "已完成",
  draft: "草稿",
} as const;

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [summary, setSummary] = useState({
    distanceKm: 0,
    elevationGainM: 0,
    durationSec: 0,
    markerCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    fetchRouteDetail(token, id)
      .then((data) => {
        setRoute(data.route);
        setMarkers(data.markers);
        setCoordinates(data.track.coordinates);
        setSummary(data.summary);
      })
      .catch(() => setRoute(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  async function onDelete() {
    if (!token || !id) return;
    Alert.alert("删除路线", "确定删除这条路线吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRoute(token, id);
            router.back();
          } catch (e) {
            Alert.alert("删除失败", e instanceof Error ? e.message : "请稍后重试");
          }
        },
      },
    ]);
  }

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#0071e3" />;
  }

  if (!route) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>路线不存在或无法加载</Text>
      </View>
    );
  }

  const dateStr = new Date(route.updatedAt).toLocaleDateString("zh-CN");

  return (
    <>
      <Stack.Screen options={{ title: route.name }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <RouteMapPreview coordinates={coordinates} markers={markers} />

        <View style={styles.sheet}>
          <View style={styles.drag} />
          <Text style={styles.title}>{route.name}</Text>
          <Text style={styles.badge}>{STATUS_LABEL[route.status]} · {dateStr}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary.distanceKm}</Text>
              <Text style={styles.statLabel}>公里</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary.elevationGainM}</Text>
              <Text style={styles.statLabel}>爬升 m</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {summary.durationSec > 0 ? formatDuration(summary.durationSec) : "—"}
              </Text>
              <Text style={styles.statLabel}>时长</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary.markerCount}</Text>
              <Text style={styles.statLabel}>标记</Text>
            </View>
          </View>

          {markers.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.markerScroll}>
              {markers.map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.miniCard}
                  onPress={() => router.push(`/routes/${route.id}/markers`)}
                >
                  <Text style={styles.miniTitle} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text style={styles.miniMeta}>
                    {MARKER_TYPE_LABEL[m.type]}
                    {m.distanceFromStart != null ? ` · ${m.distanceFromStart} km` : ""}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => Alert.alert("即将开放", "如何到达功能将在 transit PR 中实现")}
            >
              <Text style={styles.secondaryBtnText}>如何到达</Text>
            </Pressable>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push(`/routes/${route.id}/markers`)}
            >
              <Text style={styles.primaryBtnText}>管理标记</Text>
            </Pressable>
          </View>

          {route.status === "draft" ? (
            <Pressable
              style={styles.fullBtn}
              onPress={() => router.push(`/recording/${route.id}`)}
            >
              <Text style={styles.primaryBtnText}>开始记录</Text>
            </Pressable>
          ) : null}

          {route.status === "active" ? (
            <Pressable
              style={styles.fullBtn}
              onPress={() => router.push(`/recording/${route.id}`)}
            >
              <Text style={styles.primaryBtnText}>
                {route.recordingState === "paused" ? "继续记录" : "进入记录页"}
              </Text>
            </Pressable>
          ) : null}

          {route.status === "draft" ? (
            <Pressable
              style={styles.linkBtn}
              onPress={() => router.push(`/routes/plan?id=${route.id}`)}
            >
              <Text style={styles.linkText}>编辑规划</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.deleteText}>删除路线</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fff" },
  content: { paddingBottom: 32 },
  loader: { marginTop: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { fontSize: 15, color: "#6e6e73" },
  sheet: {
    marginTop: -20,
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  drag: {
    width: 36,
    height: 5,
    backgroundColor: "#d2d2d7",
    borderRadius: 3,
    alignSelf: "center",
  },
  title: { fontSize: 28, fontWeight: "700", color: "#1d1d1f" },
  badge: { fontSize: 14, color: "#6e6e73" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f7",
    borderRadius: 14,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: "#1d1d1f" },
  statLabel: { marginTop: 2, fontSize: 12, color: "#6e6e73" },
  markerScroll: { marginHorizontal: -4 },
  miniCard: {
    width: 140,
    padding: 12,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#f5f5f7",
    borderWidth: 1,
    borderColor: "#e8e8ed",
  },
  miniTitle: { fontSize: 14, fontWeight: "600" },
  miniMeta: { marginTop: 4, fontSize: 12, color: "#6e6e73" },
  actionRow: { flexDirection: "row", gap: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#0071e3",
    borderRadius: 980,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d2d2d7",
    borderRadius: 980,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#1d1d1f", fontWeight: "600", fontSize: 16 },
  fullBtn: {
    backgroundColor: "#0071e3",
    borderRadius: 980,
    paddingVertical: 14,
    alignItems: "center",
  },
  linkBtn: { alignItems: "center", paddingVertical: 8 },
  linkText: { color: "#0071e3", fontSize: 15, fontWeight: "600" },
  deleteButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#fef2f2",
  },
  deleteText: { color: "#dc2626", fontSize: 15, fontWeight: "600" },
});
