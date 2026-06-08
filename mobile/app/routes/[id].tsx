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

import { useAuth } from "@/contexts/AuthContext";
import { deleteRoute, fetchRoute, type RouteDetail } from "@/lib/api";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    fetchRoute(token, id)
      .then(({ route: data }) => setRoute(data))
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

  return (
    <>
      <Stack.Screen options={{ title: route?.name ?? "路线详情" }} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#0071e3" />
      ) : !route ? (
        <View style={styles.center}>
          <Text style={styles.error}>路线不存在或无法加载</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{route.name}</Text>
          <Text style={styles.badge}>{STATUS_LABEL[route.status]}</Text>

          <View style={styles.section}>
            <Text style={styles.label}>里程</Text>
            <Text style={styles.value}>
              {route.distanceKm != null ? `${route.distanceKm} km` : "—"}
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>标记</Text>
            <Text style={styles.value}>{route.markerCount}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>起点</Text>
            <Text style={styles.value}>{route.startPlace || "未设置"}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>终点</Text>
            <Text style={styles.value}>{route.endPlace || "未设置"}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>环线</Text>
            <Text style={styles.value}>{route.isLoop ? "是" : "否"}</Text>
          </View>

          <Text style={styles.hint}>
            完整地图、轨迹与标记详情将在后续版本提供。如何到达导航功能即将上线。
          </Text>

          {route.status === "draft" ? (
            <Pressable
              style={styles.editButton}
              onPress={() => router.push(`/routes/plan?id=${route.id}`)}
            >
              <Text style={styles.editText}>编辑规划</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.deleteText}>删除路线</Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { fontSize: 15, color: "#6e6e73" },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#1d1d1f" },
  badge: {
    alignSelf: "flex-start",
    fontSize: 13,
    fontWeight: "600",
    color: "#0071e3",
    backgroundColor: "rgba(0,113,227,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 980,
  },
  section: {
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    padding: 16,
  },
  label: { fontSize: 13, color: "#6e6e73", marginBottom: 4 },
  value: { fontSize: 17, color: "#1d1d1f" },
  hint: { fontSize: 14, color: "#6e6e73", lineHeight: 20 },
  editButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#f5f5f7",
  },
  editText: { color: "#0071e3", fontSize: 15, fontWeight: "600" },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#fef2f2",
  },
  deleteText: { color: "#dc2626", fontSize: 15, fontWeight: "600" },
});
