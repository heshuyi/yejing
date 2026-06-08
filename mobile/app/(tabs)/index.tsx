import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { fetchRoutes, type RouteSummary } from "@/lib/api";

export default function HomeScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [activeRoute, setActiveRoute] = useState<RouteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const { routes } = await fetchRoutes(token, { status: "active" });
    setActiveRoute(routes[0] ?? null);
  }, [token]);

  useEffect(() => {
    load()
      .catch(() => setActiveRoute(null))
      .finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>野径</Text>
      <Text style={styles.subtitle}>你的徒步路线与补给档案</Text>

      {loading ? (
        <ActivityIndicator color="#0071e3" style={styles.loader} />
      ) : activeRoute ? (
        <Pressable
          style={styles.activeCard}
          onPress={() => router.push(`/recording/${activeRoute.id}`)}
        >
          <View style={styles.activeBadge}>
            <View style={styles.pulse} />
            <Text style={styles.activeBadgeText}>进行中</Text>
          </View>
          <Text style={styles.activeTitle}>{activeRoute.name}</Text>
          <Text style={styles.activeMeta}>
            {activeRoute.distanceKm ?? 0} km · 点击继续记录
          </Text>
        </Pressable>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>暂无进行中的徒步</Text>
          <Text style={styles.emptyText}>在路线库规划路线后开始记录</Text>
          <Pressable style={styles.cta} onPress={() => router.push("/(tabs)/routes")}>
            <Text style={styles.ctaText}>前往路线库</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#6e6e73",
  },
  loader: { marginTop: 32 },
  activeCard: {
    marginTop: 32,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#f5f5f7",
    borderWidth: 1,
    borderColor: "#e8e8ed",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(220,38,38,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 980,
    marginBottom: 12,
  },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#dc2626" },
  activeBadgeText: { color: "#dc2626", fontSize: 12, fontWeight: "600" },
  activeTitle: { fontSize: 21, fontWeight: "600", color: "#1d1d1f" },
  activeMeta: { marginTop: 6, fontSize: 14, color: "#6e6e73" },
  emptyCard: {
    marginTop: 32,
    padding: 24,
    borderRadius: 18,
    backgroundColor: "#f5f5f7",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyText: { marginTop: 8, fontSize: 15, color: "#6e6e73", textAlign: "center" },
  cta: {
    marginTop: 16,
    backgroundColor: "#0071e3",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
