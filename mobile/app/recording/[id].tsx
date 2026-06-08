import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useGpsRecording } from "@/hooks/useGpsRecording";
import {
  createMarker,
  fetchRoute,
  fetchTrackPoints,
  finishRecording,
  pauseRecording,
  resumeRecording,
  startRecording,
  uploadTrackPoints,
  type RouteDetail,
  type TrackPointInput,
} from "@/lib/api";
import { formatDuration } from "@/lib/recordingMetrics";

function TrackPolyline({ points }: { points: { location: { coordinates: [number, number] } }[] }) {
  if (points.length < 2) return null;
  const lngs = points.map((p) => p.location.coordinates[0]);
  const lats = points.map((p) => p.location.coordinates[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const pad = 0.0001;
  const w = 280;
  const h = 120;

  const path = points
    .map((p, i) => {
      const x =
        ((p.location.coordinates[0] - minLng + pad) / (maxLng - minLng + pad * 2)) * w;
      const y =
        h - ((p.location.coordinates[1] - minLat + pad) / (maxLat - minLat + pad * 2)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <View style={styles.polylineWrap}>
      <Text style={styles.polylineSvg}>{`轨迹 ${points.length} 点`}</Text>
      <Text style={styles.polylineHint}>{path.slice(0, 40)}…</Text>
    </View>
  );
}

export default function RecordingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const onUpload = useCallback(
    async (points: TrackPointInput[]) => {
      if (!token || !id) return;
      await uploadTrackPoints(token, id, points);
    },
    [token, id],
  );

  const gps = useGpsRecording({ enabled: Boolean(route), onUpload });

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;

    async function init() {
      try {
        const [{ route: data }, { points }] = await Promise.all([
          fetchRoute(token, id),
          fetchTrackPoints(token, id),
        ]);
        if (cancelled) return;
        setRoute(data);
        gps.hydrate(points);

        if (data.status === "draft") {
          const { route: started } = await startRecording(token, id);
          setRoute(started);
          await gps.start();
        } else if (data.status === "active") {
          if (data.recordingState === "paused") {
            gps.pause();
          } else {
            await gps.start();
          }
        } else {
          Alert.alert("无法记录", "该路线已完成", [
            { text: "返回", onPress: () => router.back() },
          ]);
        }
      } catch (e) {
        Alert.alert("加载失败", e instanceof Error ? e.message : "请稍后重试", [
          { text: "返回", onPress: () => router.back() },
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  async function onPauseResume() {
    if (!token || !id) return;
    setBusy(true);
    try {
      if (gps.phase === "recording") {
        await pauseRecording(token, id);
        await gps.pause();
        setRoute((r) => (r ? { ...r, recordingState: "paused" } : r));
      } else if (gps.phase === "paused") {
        await resumeRecording(token, id);
        await gps.resume();
        setRoute((r) => (r ? { ...r, recordingState: "recording" } : r));
      }
    } catch (e) {
      Alert.alert("操作失败", e instanceof Error ? e.message : "请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  function onFinish() {
    if (!token || !id) return;
    Alert.alert("结束记录", "确定结束并保存本次徒步吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "结束保存",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await gps.stop();
            const { route: done } = await finishRecording(token, id, gps.durationSec);
            setRoute(done);
            router.replace(`/routes/${id}`);
          } catch (e) {
            Alert.alert("保存失败", e instanceof Error ? e.message : "请稍后重试");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading || !route) {
    return <ActivityIndicator style={styles.loader} color="#0071e3" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: route.name, headerBackTitle: "返回" }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.topRow}>
          <Text style={styles.title}>{route.name}</Text>
          {gps.phase === "recording" ? (
            <View style={styles.badge}>
              <View style={styles.pulse} />
              <Text style={styles.badgeText}>记录中</Text>
            </View>
          ) : (
            <Text style={styles.pausedBadge}>已暂停</Text>
          )}
        </View>

        <View style={styles.map}>
          <TrackPolyline points={gps.points} />
          {gps.useMock ? (
            <Text style={styles.mockHint}>演示模式（无 GPS 权限时使用模拟轨迹）</Text>
          ) : null}
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{gps.stats.distanceKm.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>公里</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{formatDuration(gps.durationSec)}</Text>
            <Text style={styles.metricLabel}>时长</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{gps.stats.elevationGainM}</Text>
            <Text style={styles.metricLabel}>爬升 m</Text>
          </View>
        </View>

        <Pressable
          style={styles.markerBtn}
          onPress={async () => {
            if (!token || !id) return;
            const last = gps.points[gps.points.length - 1];
            if (!last) {
              Alert.alert("暂无位置", "请等待 GPS 采样后再添加标记");
              return;
            }
            try {
              await createMarker(token, id, {
                type: "supply",
                name: `标记点 ${gps.points.length}`,
                coordinate: last.location,
              });
              Alert.alert("已添加标记");
            } catch (e) {
              Alert.alert("添加失败", e instanceof Error ? e.message : "请稍后重试");
            }
          }}
        >
          <Text style={styles.markerBtnText}>＋ 添加当前位置标记</Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            style={[styles.secondaryBtn, busy && styles.btnDisabled]}
            onPress={onPauseResume}
            disabled={busy}
          >
            <Text style={styles.secondaryBtnText}>
              {gps.phase === "recording" ? "暂停" : "继续"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={onFinish}
            disabled={busy}
          >
            <Text style={styles.primaryBtnText}>结束保存</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  content: { paddingHorizontal: 16, gap: 16 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 21, fontWeight: "600", color: "#1d1d1f", flex: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(220,38,38,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 980,
  },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#dc2626" },
  badgeText: { color: "#dc2626", fontSize: 12, fontWeight: "600" },
  pausedBadge: { color: "#6e6e73", fontSize: 13, fontWeight: "600" },
  map: {
    height: 220,
    borderRadius: 18,
    backgroundColor: "#5a7356",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  polylineWrap: { alignItems: "center" },
  polylineSvg: { color: "#fff", fontSize: 15, fontWeight: "600" },
  polylineHint: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 4 },
  mockHint: {
    position: "absolute",
    bottom: 10,
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
  },
  metrics: {
    flexDirection: "row",
    backgroundColor: "#f5f5f7",
    borderRadius: 18,
    paddingVertical: 16,
  },
  metric: { flex: 1, alignItems: "center" },
  metricValue: { fontSize: 24, fontWeight: "700", color: "#1d1d1f" },
  metricLabel: { marginTop: 4, fontSize: 12, color: "#6e6e73" },
  markerBtn: {
    borderWidth: 1,
    borderColor: "#0071e3",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(0,113,227,0.04)",
  },
  markerBtnText: { color: "#0071e3", fontSize: 15, fontWeight: "600" },
  actions: { gap: 12, marginTop: 8 },
  primaryBtn: {
    backgroundColor: "#0071e3",
    borderRadius: 980,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#0071e3",
    borderRadius: 980,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryBtnText: { color: "#0071e3", fontSize: 17, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
});
