import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { MARKER_FILTER_TYPES, MARKER_TYPE_COLOR, MARKER_TYPE_LABEL } from "@/constants/markers";
import { useAuth } from "@/contexts/AuthContext";
import {
  createMarker,
  deleteMarker,
  fetchRouteMarkers,
  type GeoPoint,
  type Marker,
  type MarkerType,
} from "@/lib/api";

const DEFAULT_COORD: GeoPoint = { type: "Point", coordinates: [120.12, 30.22] };

export default function RouteMarkersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [filter, setFilter] = useState<MarkerType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<MarkerType>("supply");
  const [facing, setFacing] = useState("");
  const [bestTime, setBestTime] = useState("");
  const [coordinate] = useState<GeoPoint>(DEFAULT_COORD);

  const load = useCallback(async () => {
    if (!token || !id) return;
    const { markers: data } = await fetchRouteMarkers(
      token,
      id,
      filter === "all" ? undefined : filter,
    );
    setMarkers(data);
  }, [token, id, filter]);

  useEffect(() => {
    load()
      .catch(() => setMarkers([]))
      .finally(() => setLoading(false));
  }, [load]);

  async function onCreate() {
    if (!token || !id || !name.trim()) {
      Alert.alert("请填写标记名称");
      return;
    }
    try {
      await createMarker(token, id, {
        type,
        name: name.trim(),
        note: note.trim() || undefined,
        coordinate,
        facing: type === "photo" ? facing.trim() || undefined : undefined,
        bestTime: type === "photo" ? bestTime.trim() || undefined : undefined,
      });
      setModalOpen(false);
      setName("");
      setNote("");
      setFacing("");
      setBestTime("");
      await load();
    } catch (e) {
      Alert.alert("添加失败", e instanceof Error ? e.message : "请稍后重试");
    }
  }

  async function onDelete(markerId: string) {
    if (!token || !id) return;
    Alert.alert("删除标记", "确定删除吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMarker(token, id, markerId);
            await load();
          } catch (e) {
            Alert.alert("删除失败", e instanceof Error ? e.message : "请稍后重试");
          }
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: "路线标记" }} />
      <View style={styles.container}>
        <View style={styles.filters}>
          {MARKER_FILTER_TYPES.map((item) => (
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
          <ActivityIndicator color="#0071e3" style={styles.loader} />
        ) : (
          <FlatList
            data={markers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={markers.length === 0 && styles.emptyList}
            ListEmptyComponent={
              <Text style={styles.empty}>暂无标记，点击下方添加</Text>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.card} onLongPress={() => onDelete(item.id)}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: MARKER_TYPE_COLOR[item.type] },
                  ]}
                />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardMeta}>
                    {MARKER_TYPE_LABEL[item.type]}
                    {item.distanceFromStart != null
                      ? ` · ${item.distanceFromStart} km`
                      : ""}
                  </Text>
                  {item.note ? (
                    <Text style={styles.cardNote} numberOfLines={2}>
                      {item.note}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        )}

        <Pressable style={styles.fab} onPress={() => setModalOpen(true)}>
          <Text style={styles.fabText}>添加标记</Text>
        </Pressable>
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>添加标记</Text>
            <View style={styles.typeRow}>
              {(["supply", "photo", "rest"] as MarkerType[]).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeChip, type === t && styles.typeChipOn]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeChipText, type === t && styles.typeChipTextOn]}>
                    {MARKER_TYPE_LABEL[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="名称"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="备注（可选）"
              value={note}
              onChangeText={setNote}
            />
            {type === "photo" ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="拍摄朝向（如：西）"
                  value={facing}
                  onChangeText={setFacing}
                />
                <TextInput
                  style={styles.input}
                  placeholder="推荐时段"
                  value={bestTime}
                  onChangeText={setBestTime}
                />
              </>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={onCreate}>
                <Text style={styles.saveText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
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
  loader: { marginTop: 40 },
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
  cardTitle: { fontSize: 17, fontWeight: "600", color: "#1d1d1f" },
  cardMeta: { marginTop: 2, fontSize: 14, color: "#6e6e73" },
  cardNote: { marginTop: 4, fontSize: 13, color: "#86868b" },
  fab: {
    backgroundColor: "#0071e3",
    borderRadius: 980,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  fabText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 21, fontWeight: "600" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 980,
    borderWidth: 1,
    borderColor: "#d2d2d7",
  },
  typeChipOn: { borderColor: "#0071e3", backgroundColor: "rgba(0,113,227,0.06)" },
  typeChipText: { fontSize: 14 },
  typeChipTextOn: { color: "#0071e3", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#d2d2d7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: { color: "#6e6e73", fontSize: 16 },
  saveBtn: {
    backgroundColor: "#0071e3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveText: { color: "#fff", fontWeight: "600" },
});
