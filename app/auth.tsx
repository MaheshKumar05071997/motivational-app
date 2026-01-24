import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { supabase } from "../supabaseConfig";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false); // <--- NEW STATE

  async function handleAuth() {
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert("Success", "Check your email for confirmation!");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* 1. Gradient Removed so Video Background shows */}
      {/* <LinearGradient
        colors={[Colors.premium.gradientStart, "#000000"]}
        style={StyleSheet.absoluteFill}
      /> */}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <Animated.View
          entering={FadeInUp.duration(1000).springify()}
          style={styles.content}
        >
          {/* 2. Glass Form Container */}
          <BlurView intensity={80} tint="dark" style={styles.glassCard}>
            {/* Header Icon */}
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={32} color={Colors.premium.gold} />
            </View>

            <Text style={styles.title}>
              {isLogin ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? "Sign in to continue" : "Join the exclusive club"}
            </Text>

            {/* Inputs */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#A1A1AA"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#A1A1AA"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword} // <--- Toggles hidden/shown
              />
              {/* Eye Icon to Toggle */}
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#A1A1AA"
                />
              </TouchableOpacity>
            </View>

            {/* Main Action Button */}
            <TouchableOpacity
              onPress={handleAuth}
              disabled={loading}
              style={styles.mainButton}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.mainButtonText}>
                  {isLogin ? "Sign In" : "Sign Up"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Mode */}
            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Text style={{ color: Colors.premium.gold, fontWeight: "700" }}>
                  {isLogin ? "Sign Up" : "Log In"}
                </Text>
              </Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: "center", padding: 20 },
  content: { width: "100%", alignItems: "center" },
  glassCard: {
    width: "100%",
    padding: 30,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.premium.gold,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#A1A1AA",
    textAlign: "center",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  mainButton: {
    backgroundColor: Colors.premium.gold,
    height: 55,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: Colors.premium.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  mainButtonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },
  toggleButton: {
    marginTop: 20,
    alignItems: "center",
  },
  toggleText: {
    color: "#ccc",
    fontSize: 14,
  },
});
