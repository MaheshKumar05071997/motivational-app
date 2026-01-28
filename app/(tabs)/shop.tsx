import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "../../supabaseConfig";
import { usePlayer } from "../PlayerContext";

const { width } = Dimensions.get("window");

export default function ShopScreen() {
  const router = useRouter();
  const { isPremium, triggerCelebration, refreshProfile, showAlert } =
    usePlayer();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPoints();
  }, []);

  async function fetchPoints() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();
      if (data) setPoints(data.points || 0);
    }
  }

  async function buyOneDayPremium() {
    if (points < 500) {
      return showAlert({
        title: "Low Karma",
        message: "You need 500 Points to unlock this feature.",
        icon: "alert-circle",
        primaryText: "Got it",
      });
    }
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { error } = await supabase
        .from("profiles")
        .update({
          points: points - 500,
          subscription_expiry: tomorrow.toISOString(),
        })
        .eq("id", user.id);

      if (!error) {
        setPoints(points - 500);
        await refreshProfile();
        triggerCelebration();
        // --- NEW: IN-APP NOTIFICATION ---
        showAlert({
          title: "🎉 CONGRATULATIONS!",
          message:
            "You have successfully redeemed 24 Hours of Premium Access! Enjoy the divine vibes.",
          icon: "diamond",
          primaryText: "Awesome!",
          onPrimaryPress: () => router.back(),
        });
      } else {
        Alert.alert("Error", "Transaction Failed");
      }
    }
    setLoading(false);
  }

  // Shimmer Effect
  const shimmerVal = useSharedValue(-width);
  useEffect(() => {
    shimmerVal.value = withRepeat(
      withTiming(width, { duration: 2000 }),
      -1,
      false,
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerVal.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Background Gradient removed to reveal Global Live Background */}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Karma Store 🛒</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{points} PTS</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* --- PREMIUM PASS CARD --- */}
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.cardContainer}
        >
          <LinearGradient
            colors={[Colors.premium.gold, "#B8860B"]}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>MOST POPULAR</Text>
              <Text style={styles.cardTitle}>24-Hour God Mode</Text>
              <Text style={styles.cardDesc}>
                Unlock all premium meditations, ad-free experience, and
                exclusive mantras for 1 day.
              </Text>

              <TouchableOpacity
                onPress={buyOneDayPremium}
                disabled={loading || isPremium}
                style={styles.buyBtn}
              >
                <Text style={styles.buyBtnText}>
                  {loading
                    ? "Processing..."
                    : isPremium
                      ? "ALREADY ACTIVE"
                      : "REDEEM (500 PTS)"}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Shimmer Overlay */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "rgba(255,255,255,0.1)",
                  overflow: "hidden",
                },
                shimmerStyle,
              ]}
            />
          </LinearGradient>
        </Animated.View>

        {/* --- OTHER SECTIONS --- */}
        <Text style={styles.sectionHeader}>Coming Soon</Text>
        <View style={{ flexDirection: "row", gap: 15 }}>
          <View style={styles.comingSoonCard}>
            <Ionicons name="shirt" size={30} color="#555" />
            <Text style={styles.csText}>Merch</Text>
          </View>
          <View style={styles.comingSoonCard}>
            <Ionicons name="ticket" size={30} color="#555" />
            <Text style={styles.csText}>Events</Text>
          </View>
          <View style={styles.comingSoonCard}>
            <Ionicons name="gift" size={30} color="#555" />
            <Text style={styles.csText}>Gifts</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  pointsBadge: {
    backgroundColor: Colors.premium.gold,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pointsText: { color: "#000", fontWeight: "bold" },

  cardContainer: { marginBottom: 40 },
  card: {
    padding: 25,
    borderRadius: 25,
    minHeight: 200,
    justifyContent: "center",
  },
  cardLabel: {
    color: "rgba(0,0,0,0.6)",
    fontWeight: "900",
    fontSize: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#000",
    marginBottom: 10,
  },
  cardDesc: { color: "#222", fontSize: 14, lineHeight: 20, marginBottom: 20 },
  buyBtn: {
    backgroundColor: "#000",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
  },
  buyBtnText: { color: Colors.premium.gold, fontWeight: "bold", fontSize: 16 },

  sectionHeader: {
    color: "#888",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  comingSoonCard: {
    flex: 1,
    backgroundColor: "#111",
    height: 120,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  csText: { color: "#555", marginTop: 10, fontWeight: "bold" },
});
