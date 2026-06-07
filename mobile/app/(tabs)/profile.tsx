import { Pressable, StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>我的</Text>
      <Text style={styles.subtitle}>{user?.displayName ?? "徒步者"}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Pressable style={styles.logout} onPress={() => logout()}>
        <Text style={styles.logoutText}>退出登录</Text>
      </Pressable>
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
    marginTop: 8,
    fontSize: 14,
    opacity: 0.5,
  },
  logout: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#f5f5f7",
  },
  logoutText: {
    fontSize: 15,
    color: "#0071e3",
    fontWeight: "600",
  },
});
