import { StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>地图</Text>
      <Text style={styles.subtitle}>即将展示轨迹与标记</Text>
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
