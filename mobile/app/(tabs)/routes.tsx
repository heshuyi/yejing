import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import {
  createRoute,
  fetchRoutes,
  type RouteStatus,
  type RouteSummary,
} from "@/lib/api";

type FilterKey = "all" | RouteStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "completed", label: "已完成" },
  { key: "draft", label: "草稿" },
];

const STATUS_LABEL: Record<RouteStatus, string> = {
  active: "进行中",
  completed: "已完成",
  draft: "草稿",
};

const STATUS_STYLE: Record<RouteStatus, object> = {
  active: styles.badgeActive,
  completed: styles.badgeDone,
  draft: styles.badgeDraft,
};

function formatSubtitle(route: RouteSummary): string {
  const parts: string[] = [];
  if (route.distanceKm != null) {
    parts.push(`${route.distanceKm} km`);
  }
  if (route.markerCount > 0) {
    parts.push(`${route.markerCount} 标记`);
  }
  if (route.status === "active") {
    parts.push("记录中");
  } else {
    const date = new Date(route.updatedAt);
    parts.push(date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }));
  }
  return parts.join(" · ") || "暂无数据";
}

export default function RoutesScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const loadRoutes = useCallback(async () => {
    if (!token) return;
    const { routes: data } = await fetchRoutes(token, {
      status: filter === "all" ? undefined : filter,
      q: query,
    });
    setRoutes(data);
  }, [token, filter, query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadRoutes()
      .catch(() => {
        if (!cancelled) setRoutes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadRoutes]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadRoutes();
    } finally {
      setRefreshing(false);
    }
  }

  async function onCreateDraft() {
    if (!token) return;
    try {
      await createRoute(token, { name: "我的第一条路线" });
      await loadRoutes();
    } catch (e) {
      Alert.alert("创建失败", e instanceof Error ? e.message : "请稍后重试");
    }
  }

  function onPlanRoute() {
    Alert.alert("即将开放", "规划新路线功能将在下一版 PR 中实现。");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.heading}>路线库</Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索路线名称或地点"
          placeholderTextColor="#6e6e73"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.chip, filter === item.key && styles.chipOn]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.chipText, filter === item.key && styles.chipTextOn]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#0071e3" />
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[
            styles.list,
            routes.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>还没有路线</Text>
              <Text style={styles.emptyText}>创建一条草稿，或等待规划功能上线</Text>
              <Pressable style={styles.emptyButton} onPress={onCreateDraft}>
                <Text style={styles.emptyButtonText}>创建草稿路线</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/routes/${item.id}`)}
            >
              <View style={styles.thumb}>
                <View style={styles.thumbLine} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {formatSubtitle(item)}
                </Text>
                {item.startPlace ? (
                  <Text style={styles.cardPlace} numberOfLines={1}>
                    {item.startPlace}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.badge, STATUS_STYLE[item.status]]}>
                {STATUS_LABEL[item.status]}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Pressable style={[styles.fab, { bottom: insets.bottom + 56 }]} onPress={onPlanRoute}>
        <Text style={styles.fabText}>规划路线</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 21,
    fontWeight: "600",
    color: "#1d1d1f",
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8ed",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: "#1d1d1f",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: "#d2d2d7",
    backgroundColor: "#fff",
  },
  chipOn: {
    borderColor: "#0071e3",
    backgroundColor: "rgba(0,113,227,0.06)",
  },
  chipText: { fontSize: 14, color: "#1d1d1f" },
  chipTextOn: { color: "#0071e3", fontWeight: "600" },
  loader: { marginTop: 40 },
  list: { paddingBottom: 80, gap: 12 },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#1d1d1f" },
  emptyText: { marginTop: 8, fontSize: 15, color: "#6e6e73", textAlign: "center" },
  emptyButton: {
    marginTop: 20,
    backgroundColor: "#0071e3",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e8e8ed",
    borderRadius: 18,
  },
  thumb: {
    width: 88,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#1a2e22",
    overflow: "hidden",
    justifyContent: "center",
    padding: 8,
  },
  thumbLine: {
    height: 2,
    backgroundColor: "#0071e3",
    borderRadius: 1,
    transform: [{ rotate: "-12deg" }],
    marginTop: 24,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "600", color: "#1d1d1f" },
  cardMeta: { marginTop: 2, fontSize: 14, color: "#6e6e73" },
  cardPlace: { marginTop: 2, fontSize: 12, color: "#6e6e73" },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 980,
    overflow: "hidden",
  },
  badgeActive: { backgroundColor: "rgba(0,113,227,0.08)", color: "#0071e3" },
  badgeDone: { backgroundColor: "rgba(22,163,74,0.1)", color: "#16a34a" },
  badgeDraft: { backgroundColor: "#f5f5f7", color: "#6e6e73" },
  fab: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#0071e3",
    borderRadius: 980,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  fabText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
