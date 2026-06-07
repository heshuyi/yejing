import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await register(email.trim(), password, displayName.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "注册失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.brand}>野径</Text>
        <Text style={styles.title}>注册</Text>
        <Text style={styles.subtitle}>创建账号，同步你的路线数据</Text>

        <TextInput
          style={styles.input}
          placeholder="昵称（可选）"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="邮箱"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="密码（至少 8 位）"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>注册</Text>
          )}
        </Pressable>

        <Link href="/(auth)/login" style={styles.link}>
          已有账号？登录
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", padding: 24 },
  brand: { fontSize: 15, fontWeight: "600", color: "#0071e3", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#1d1d1f" },
  subtitle: { marginTop: 8, fontSize: 15, color: "#6e6e73", marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#d2d2d7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    marginBottom: 12,
    backgroundColor: "#f5f5f7",
  },
  error: { color: "#dc2626", marginBottom: 12, fontSize: 14 },
  button: {
    backgroundColor: "#0071e3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  link: { marginTop: 20, textAlign: "center", color: "#0071e3", fontSize: 15 },
});
