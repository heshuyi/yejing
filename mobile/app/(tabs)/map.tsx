import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MARKER_FILTER_TYPES, MARKER_TYPE_COLOR, MARKER_TYPE_LABEL } from "@/constants/markers";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllMarkers, fetchRoutes, type Marker, type MarkerType, type RouteSummary } from "@/lib/api";

export default function MapScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [typeFilter, setTypeFilter] = useState<MarkerType | "all">("all");
  const [routeFilter, setRouteFilter] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [{ markers: data }, { routes: routeList }] = await Promise.all([
      fetchAllMarkers(token, {
        type: typeFilter === "all" ? undefined : typeFilter,
        routeId: routeFilter === "all" ? undefined : routeFilter,
      }),
      fetchRoutes(token),
    ]);
    setMarkers(data);
    setRoutes(routeList);
  }, [token, typeFilter, routeFilter]);

  useEffect(() => {
    load()
      .catch(() => setMarkers([]))
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
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.heading}>地图 · 标记</Text>
      <Text style={styles.subheading}>跨路线查看补给与美照位置</Text>

      <View style={styles.filters}>
        {MARKER_FILTER_TYPES.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.chip, typeFilter === item.key && styles.chipOn]}
            onPress={() => setTypeFilter(item.key)}
          >
            <Text style={[styles.chipText, typeFilter === item.key && styles.chipTextOn]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        horizontal
        data={[{ id: "all", name: "全部路线" }, ...routes]}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.routeFilters}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.routeChip, routeFilter === item.id && styles.chipOn]}
            onPress={() => setRouteFilter(item.id)}
          >
            <Text
              style={[styles.chipText, routeFilter === item.id && styles.chipTextOn]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />

      {loading ? (
        <ActivityIndicator color="#0071e3" style={styles.loader} />
      ) : (
        <FlatList
          data={markers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={markers.length === 0 && styles.emptyList}
          ListEmptyComponent={<Text style={styles.empty}>暂无标记</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/routes/${item.routeId}/markers`)}
            >
              <View
                style={[styles.dot, { backgroundColor: MARKER_TYPE_COLOR[item.type] }]}
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.routeName ?? "路线"} · {MARKER_TYPE_LABEL[item.type]}
                  {item.distanceFromStart != null ? ` · ${item.distanceFromStart} km` : ""}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  heading: { fontSize: 21, fontWeight: "600", color: "#1d1d1f" },
  subheading: { marginTop: 4, fontSize: 14, color: "#6e6e73", marginBottom: 12 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  routeFilters: { maxHeight: 44, marginBottom: 12 },
  routeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: "#d2d2d7",
    marginRight: 8,
    maxWidth: 140,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: "#d2d2d7",
  },
  chipOn: { borderColor: "#0071e3", backgroundColor: "rgba(0,113,227,0.06)" },
  chipText: { fontSize: 14, color: "#1d1d1f" },
  chipTextOn: { color: "#0071e3", fontWeight: "600" },
  loader: { marginTop: 32 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  empty: { textAlign: "center", color: "#6e6e73", fontSize: 15 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e8e8ed",
    marginBottom: 10,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  cardMeta: { marginTop: 2, fontSize: 14, color: "#6e6e73" },
});
