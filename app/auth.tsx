import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as ExpoLinking from "expo-linking"; // <--- ADD THIS for createURL
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { supabase } from "../supabaseConfig";
import { usePlayer } from "./PlayerContext";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const { showAlert } = usePlayer();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false); // <--- NEW STATE

  async function handleAuth() {
    setLoading(true);
    try {
      if (isLogin) {
        // --- 1. LOG IN ---
        const {
          data: { user },
          error,
        } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // --- 2. SAFETY CHECK: CREATE PROFILE IF MISSING ---
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (!profile) {
            // Profile is missing! Create it now to prevent "Profile Not Found" errors.
            await supabase.from("profiles").insert([
              {
                id: user.id,
                email: user.email, // <--- ADD THIS LINE
                full_name: "Soul",
              },
            ]);
          }
        }
      } else {
        // --- 1. SIGN UP ---
        const {
          data: { user },
          error,
        } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // --- 2. CREATE PROFILE IMMEDIATELY ---
        // This ensures the row exists even before the user logs in fully
        if (user) {
          await supabase.from("profiles").insert([
            {
              id: user.id,
              email: user.email, // <--- ADD THIS LINE
              full_name: "Soul",
            },
          ]);
        }

        Alert.alert("Success", "Check your email for confirmation!");
      }
    } catch (error: any) {
      showAlert({
        title: "Authentication Error",
        message: error.message,
        icon: "warning",
        primaryText: "Try Again",
      });
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: Google Sign In Handler
  async function performGoogleSignIn() {
    try {
      setLoading(true);

      // 1. Create a clean URL (e.g. motivationalapp://home)
      const redirectUrl = ExpoLinking.createURL("home");
      console.log("🚀 REDIRECT URL SENT TO SUPABASE:", redirectUrl);

      // 2. Get the OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // 3. Open Browser
      if (data.url) {
        Linking.openURL(data.url);
      }
    } catch (e: any) {
      Alert.alert("Google Login Error", e.message);
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

            {/* ✅ NEW: Google Button & Divider */}
            {isLogin && (
              <View
                style={{ width: "100%", alignItems: "center", marginTop: 20 }}
              >
                {/* Divider */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: "rgba(255,255,255,0.1)",
                    }}
                  />
                  <Text
                    style={{
                      color: "#666",
                      marginHorizontal: 10,
                      fontSize: 12,
                    }}
                  >
                    OR
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: "rgba(255,255,255,0.1)",
                    }}
                  />
                </View>

                {/* Google Button */}
                <TouchableOpacity
                  onPress={performGoogleSignIn}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FFF",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                    width: "100%",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name="logo-google" size={20} color="#000" />
                  <Text
                    style={{ color: "#000", fontWeight: "600", fontSize: 16 }}
                  >
                    Sign in with Google
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
