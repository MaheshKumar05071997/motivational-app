import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { supabase } from "../supabaseConfig";

const { width } = Dimensions.get("window");

export default function PaywallScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // --- LOGIC PRESERVED 100% ---
  async function handleTestSubscribe() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Error", "You must be logged in!");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      is_premium: true,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success! 👑", "Welcome to Premium. The locks are open.");
      router.back();
    }
    setLoading(false);
  }
  // ---------------------------

  return (
    <View style={styles.container}>
      {/* 1. Background: Deep Luxury Gradient */}
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#2c2c2c"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Optional: Add a subtle background image if you have one, otherwise the gradient is clean */}

      {/* 2. Close Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.closeButton}
      >
        <BlurView intensity={20} style={styles.closeButtonBlur}>
          <Ionicons name="close" size={24} color="#fff" />
        </BlurView>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* 3. Icon & Header */}
        <Animated.View
          entering={FadeInUp.duration(1000).springify()}
          style={{ alignItems: "center" }}
        >
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[Colors.premium.gold, "#B8860B"]}
              style={styles.iconBackground}
            >
              <Ionicons name="diamond" size={50} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Elevate your mindset without limits.
          </Text>
        </Animated.View>

        {/* 4. Benefits List (Animated) */}
        <View style={styles.benefitsContainer}>
          <BenefitRow
            delay={200}
            text="Unlock all exclusive tracks"
            icon="lock-open"
          />
          <BenefitRow
            delay={400}
            text="Ad-free listening experience"
            icon="ban"
          />
          <BenefitRow
            delay={600}
            text="High-quality audio streaming"
            icon="musical-notes"
          />
          <BenefitRow
            delay={800}
            text="Support independent creators"
            icon="heart"
          />
        </View>

        {/* 5. Pricing Card (Glass) */}
        <Animated.View
          entering={FadeInDown.delay(1000).springify()}
          style={{ width: "100%" }}
        >
          <BlurView intensity={20} tint="light" style={styles.priceCard}>
            <View>
              <Text style={styles.planName}>MONTHLY ACCESS</Text>
              <Text style={styles.price}>
                ₹99<Text style={styles.perMonth}>/mo</Text>
              </Text>
            </View>
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
          </BlurView>
        </Animated.View>

        {/* 6. Subscribe Button */}
        <Animated.View
          entering={FadeInDown.delay(1200).springify()}
          style={{ width: "100%" }}
        >
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleTestSubscribe}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <LinearGradient
                colors={[Colors.premium.gold, "#F4C430"]}
                style={styles.gradientButton}
              >
                <Text style={styles.subscribeText}>Start Premium Now</Text>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </LinearGradient>
            )}
          </TouchableOpacity>
          <Text style={styles.cancelText}>Cancel anytime. Secure payment.</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// Helper Component for List Items
function BenefitRow({ text, icon, delay }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={styles.benefitRow}
    >
      <View style={styles.checkCircle}>
        <Ionicons name={icon} size={16} color={Colors.premium.gold} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  closeButtonBlur: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  iconContainer: {
    shadowColor: Colors.premium.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    marginBottom: 25,
  },
  iconBackground: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: "#A1A1AA",
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },

  benefitsContainer: {
    width: "100%",
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  benefitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },

  priceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.premium.gold,
    marginBottom: 20,
    overflow: "hidden",
  },
  planName: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 5,
  },
  price: { color: "#fff", fontSize: 28, fontWeight: "800" },
  perMonth: { fontSize: 14, color: "#888", fontWeight: "400" },

  bestValueBadge: {
    backgroundColor: Colors.premium.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bestValueText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 10,
  },

  subscribeButton: {
    width: "100%",
    borderRadius: 30,
    shadowColor: Colors.premium.gold,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 15,
  },
  gradientButton: {
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderRadius: 30,
  },
  subscribeText: { color: "black", fontSize: 18, fontWeight: "800" },
  cancelText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
  },
});
