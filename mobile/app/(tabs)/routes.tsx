import { StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";

export default function RoutesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>路线库</Text>
      <Text style={styles.subtitle}>即将支持路线列表与搜索</Text>
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
});
