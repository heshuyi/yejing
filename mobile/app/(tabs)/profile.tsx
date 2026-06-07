import { StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";
import { API_URL } from "@/constants/api";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>我的</Text>
      <Text style={styles.subtitle}>设置与数据管理</Text>
      <Text style={styles.meta}>API: {API_URL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 21,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    opacity: 0.6,
  },
  meta: {
    marginTop: 24,
    fontSize: 12,
    opacity: 0.4,
  },
});
