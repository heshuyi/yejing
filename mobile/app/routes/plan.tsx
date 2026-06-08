import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  defaultEndPoint,
  defaultStartPoint,
  MapPickPlaceholder,
  type GeoPoint,
} from "@/components/MapPickPlaceholder";
import { useAuth } from "@/contexts/AuthContext";
import { createRoute, fetchRoute, updateRoute, type RouteDetail } from "@/lib/api";

type GoalOption = {
  label: string;
  value: { min?: number; max?: number } | null;
};

const GOAL_OPTIONS: GoalOption[] = [
  { label: "不设定", value: null },
  { label: "5–10 km", value: { min: 5, max: 10 } },
  { label: "10–15 km", value: { min: 10, max: 15 } },
  { label: "15–25 km", value: { min: 15, max: 25 } },
  { label: "25 km 以上", value: { min: 25 } },
];

function goalLabel(value: { min?: number; max?: number } | null | undefined): string {
  if (!value) return "不设定";
  const found = GOAL_OPTIONS.find(
    (o) => o.value?.min === value.min && o.value?.max === value.max,
  );
  return found?.label ?? "不设定";
}

function buildPayload(input: {
  name: string;
  isLoop: boolean;
  startPlace: string;
  endPlace: string;
  startCoordinate: GeoPoint;
  endCoordinate: GeoPoint;
  goalDistanceKm: { min?: number; max?: number } | null;
}) {
  const startPlace = input.startPlace.trim();
  const endPlace = input.isLoop
    ? startPlace
    : input.endPlace.trim() || startPlace;
  const endCoordinate = input.isLoop ? input.startCoordinate : input.endCoordinate;

  return {
    name: input.name.trim(),
    isLoop: input.isLoop,
    startPlace: startPlace || undefined,
    endPlace: endPlace || undefined,
    startCoordinate: input.startCoordinate,
    endCoordinate,
    goalDistanceKm: input.goalDistanceKm,
  };
}

export default function PlanRouteScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [startPlace, setStartPlace] = useState("");
  const [endPlace, setEndPlace] = useState("");
  const [isLoop, setIsLoop] = useState(false);
  const [startCoordinate, setStartCoordinate] = useState(defaultStartPoint());
  const [endCoordinate, setEndCoordinate] = useState(defaultEndPoint());
  const [goalDistanceKm, setGoalDistanceKm] = useState<GoalOption["value"]>(null);

  useEffect(() => {
    if (!token || !id) return;
    fetchRoute(token, id)
      .then(({ route }) => {
        if (route.status !== "draft") {
          Alert.alert("无法编辑", "仅草稿路线可编辑", [
            { text: "返回", onPress: () => router.back() },
          ]);
          return;
        }
        applyRoute(route);
      })
      .catch(() => Alert.alert("加载失败", "无法读取路线"))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  function applyRoute(route: RouteDetail) {
    setName(route.name);
    setStartPlace(route.startPlace ?? "");
    setEndPlace(route.endPlace ?? "");
    setIsLoop(route.isLoop);
    if (route.startCoordinate) setStartCoordinate(route.startCoordinate as GeoPoint);
    if (route.endCoordinate) setEndCoordinate(route.endCoordinate as GeoPoint);
    setGoalDistanceKm(route.goalDistanceKm ?? null);
  }

  function onLoopChange(next: boolean) {
    setIsLoop(next);
    if (next) {
      setEndPlace(startPlace);
      setEndCoordinate(startCoordinate);
    }
  }

  function onStartPlaceChange(value: string) {
    setStartPlace(value);
    if (isLoop) setEndPlace(value);
  }

  function onMapChange(next: {
    startCoordinate?: GeoPoint;
    endCoordinate?: GeoPoint;
  }) {
    if (next.startCoordinate) {
      setStartCoordinate(next.startCoordinate);
      if (isLoop) setEndCoordinate(next.startCoordinate);
    }
    if (next.endCoordinate && !isLoop) {
      setEndCoordinate(next.endCoordinate);
    }
  }

  async function save(andPlanTransit: boolean) {
    if (!token) return;
    if (!name.trim()) {
      Alert.alert("请填写路线名称");
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload({
        name,
        isLoop,
        startPlace,
        endPlace,
        startCoordinate,
        endCoordinate,
        goalDistanceKm,
      });

      let routeId = id;
      if (isEdit && id) {
        const { route } = await updateRoute(token, id, payload);
        routeId = route.id;
      } else {
        const { route } = await createRoute(token, payload);
        routeId = route.id;
      }

      if (andPlanTransit) {
        router.replace(`/routes/${routeId}`);
      } else {
        router.replace("/(tabs)/routes");
      }
    } catch (e) {
      Alert.alert("保存失败", e instanceof Error ? e.message : "请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <ActivityIndicator style={styles.loader} color="#0071e3" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: "规划新路线" }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.steps}>
            <View style={[styles.step, styles.stepDone]} />
            <View style={[styles.step, styles.stepDone]} />
            <View style={styles.step} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>路线名称</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：雾凇岭环线"
              value={name}
              onChangeText={setName}
            />
          </View>

          <MapPickPlaceholder
            startCoordinate={startCoordinate}
            endCoordinate={isLoop ? startCoordinate : endCoordinate}
            onChange={onMapChange}
          />

          <View style={styles.field}>
            <Text style={styles.label}>起点名称</Text>
            <TextInput
              style={styles.input}
              placeholder="停车场、公交站…"
              value={startPlace}
              onChangeText={onStartPlaceChange}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>终点名称</Text>
            <TextInput
              style={styles.input}
              placeholder="可与起点相同（环线）"
              value={isLoop ? startPlace : endPlace}
              onChangeText={setEndPlace}
              editable={!isLoop}
            />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>环线模式</Text>
              <Text style={styles.toggleHint}>终点自动对齐起点</Text>
            </View>
            <Switch
              value={isLoop}
              onValueChange={onLoopChange}
              trackColor={{ false: "#d2d2d7", true: "#0071e3" }}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>目标距离（可选）</Text>
            <View style={styles.goalRow}>
              {GOAL_OPTIONS.map((option) => (
                <Pressable
                  key={option.label}
                  style={[
                    styles.goalChip,
                    goalLabel(goalDistanceKm) === option.label && styles.goalChipOn,
                  ]}
                  onPress={() => setGoalDistanceKm(option.value)}
                >
                  <Text
                    style={[
                      styles.goalChipText,
                      goalLabel(goalDistanceKm) === option.label && styles.goalChipTextOn,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.gpxBox}>
            <Text style={styles.gpxTitle}>导入 GPX 参考轨迹</Text>
            <Text style={styles.gpxHint}>即将开放 · 可选预览路线走向</Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={() => save(true)}
            disabled={submitting}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? "保存中…" : "保存并规划到达"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.ghostBtn}
            onPress={() => save(false)}
            disabled={submitting}
          >
            <Text style={styles.ghostBtnText}>仅保存草稿</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  loader: { marginTop: 40 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  steps: { flexDirection: "row", gap: 8 },
  step: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e8e8ed" },
  stepDone: { backgroundColor: "#0071e3" },
  field: { gap: 8 },
  label: { fontSize: 14, color: "#6e6e73" },
  input: {
    borderWidth: 1,
    borderColor: "#d2d2d7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 17,
    backgroundColor: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f5f5f7",
    borderRadius: 18,
    padding: 16,
  },
  toggleTitle: { fontSize: 17, fontWeight: "600", color: "#1d1d1f" },
  toggleHint: { marginTop: 2, fontSize: 14, color: "#6e6e73" },
  goalRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: "#d2d2d7",
  },
  goalChipOn: { borderColor: "#0071e3", backgroundColor: "rgba(0,113,227,0.06)" },
  goalChipText: { fontSize: 14, color: "#1d1d1f" },
  goalChipTextOn: { color: "#0071e3", fontWeight: "600" },
  gpxBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d2d2d7",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  gpxTitle: { fontSize: 17, fontWeight: "600", color: "#1d1d1f" },
  gpxHint: { marginTop: 8, fontSize: 14, color: "#6e6e73" },
  primaryBtn: {
    backgroundColor: "#0071e3",
    borderRadius: 980,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  btnDisabled: { opacity: 0.7 },
  ghostBtn: { paddingVertical: 12, alignItems: "center" },
  ghostBtnText: { color: "#0071e3", fontSize: 17, fontWeight: "600" },
});
