import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // <--- For Gold Card
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text, // <--- Added for Edit Name
  TouchableOpacity,
  View,
  animatedBreath,
} from "react-native";
import Animated from "react-native-reanimated"; // <--- Animations
import { usePlayer } from "../../app/PlayerContext";
import { supabase } from "../../supabaseConfig";

export default function ProfileScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Loading...");
  const [userEmail, setUserEmail] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  // RESTORED: Your original stats state
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    streak: 0,
    minutes: 0,
    points: 0, // <--- NEW SEPARATE STAT
    level: "Novice",
  }); // Gamification State

  const [favorites, setFavorites] = useState([]); // <--- NEW STATE
  const { playTrackList } = usePlayer(); // <--- NEW HOOK
  // Edit Name State
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");

  // Fetch Favorites Wrapper
  async function getFavorites() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select("audios(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }) // Recent first
      .limit(3); // <--- ONLY TOP 3

    if (data) {
      // Flatten the response (Supabase returns { audios: {...} })
      const songs = data.map((item) => item.audios).filter(Boolean);
      setFavorites(songs);
    }
  }

  // RESTORED: Your exact logic to fetch data
  useFocusEffect(
    useCallback(() => {
      getProfile();
      getFavorites(); // <--- CALL THIS TOO
    }, []),
  );

  async function getProfile() {
    try {
      setLoading(true);

      // 1. Get the current User from Supabase Auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return; // <--- ADDS SAFETY CHECK

      // 2. Set Basic Info
      setUserEmail(user?.email || "");

      // 3. Fetch Real Data
      const { data } = await supabase
        .from("profiles")
        .select(`full_name, streak_count, total_minutes, points`)
        .eq("id", user.id)
        .single();

      // FIX: Prefer Database Name -> then Email -> then "Soul"
      if (data) {
        setDisplayName(data.full_name || user.email?.split("@")[0] || "Soul");
        // ... rest of stats logic
      }

      if (data) {
        // 4. Calculate Level dynamically based on REAL database minutes
        const mins = data.total_minutes || 0;
        let currentLevel = "Sadhak (Novice)";
        if (mins > 100) currentLevel = "Yogi (Seeker)";
        if (mins > 500) currentLevel = "Rishi (Master)";

        // 5. Update the UI with Database values
        setStats({
          streak: data.streak_count || 0,
          minutes: mins,
          points: data.points || 0, // <--- SET POINTS
          level: currentLevel,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log("Profile Error:", error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function testNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Test Notification",
          body: "Boom! Your notifications are working perfectly.",
          sound: true,
        },
        trigger: {
          seconds: 2,
          channelId: "default", // <--- REQUIRED for Android
        } as any,
      });
      Alert.alert("Success", "Wait 2 seconds...");
    } catch (error) {
      // Graceful fallback for Expo Go limitations
      Alert.alert(
        "Notice",
        "Notifications may not work in Expo Go on Android (SDK 53). They will work in the final built app.",
      );
      console.log(error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HEADER */}
        <View style={styles.header}>
          <Animated.View style={[styles.avatarWrapper, animatedBreath]}>
            <LinearGradient
              colors={[Colors.premium.gold, "#FFA07A"]}
              style={styles.avatarRing}
            >
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={40} color="#fff" />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* NAME DISPLAY (Prioritizes DB Name) */}
          <TouchableOpacity
            onPress={() => {
              setNewName(displayName);
              setIsEditing(true);
            }}
          >
            <Text style={styles.username}>
              {isEditing ? "Editing..." : displayName}
            </Text>
            {!isEditing && (
              <Text style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                Tap to change name
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. THE JOURNEY MAP (Level Logic) */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text style={styles.sectionTitle}>Your Spiritual Journey</Text>

          {/* Level 1: Sadhak */}
          <View
            style={[styles.levelRow, stats.minutes < 100 && styles.activeLevel]}
          >
            <View
              style={[styles.dot, stats.minutes >= 0 ? styles.dotActive : {}]}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.levelTitle,
                  stats.minutes < 100 && { color: Colors.premium.gold },
                ]}
              >
                Sadhak (Beginner)
              </Text>
              <Text style={styles.levelDesc}>
                0 - 100 Mins • The Seeker starts the path.
              </Text>
            </View>
            {stats.minutes < 100 && (
              <View style={styles.currentBadge}>
                <Text style={styles.badgeText}>YOU</Text>
              </View>
            )}
          </View>

          {/* Connector Line */}
          <View
            style={{
              height: 20,
              borderLeftWidth: 2,
              borderLeftColor: "#333",
              marginLeft: 9,
              marginVertical: 5,
            }}
          />

          {/* Level 2: Yogi */}
          <View
            style={[
              styles.levelRow,
              stats.minutes >= 100 && stats.minutes < 500 && styles.activeLevel,
            ]}
          >
            <View
              style={[styles.dot, stats.minutes >= 100 ? styles.dotActive : {}]}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.levelTitle,
                  stats.minutes >= 100 &&
                    stats.minutes < 500 && { color: Colors.premium.gold },
                ]}
              >
                Yogi (Practitioner)
              </Text>
              <Text style={styles.levelDesc}>
                100 - 500 Mins • Disciplined & Focused.
              </Text>
            </View>
            {stats.minutes >= 100 && stats.minutes < 500 && (
              <View style={styles.currentBadge}>
                <Text style={styles.badgeText}>YOU</Text>
              </View>
            )}
          </View>

          {/* Connector Line */}
          <View
            style={{
              height: 20,
              borderLeftWidth: 2,
              borderLeftColor: "#333",
              marginLeft: 9,
              marginVertical: 5,
            }}
          />

          {/* Level 3: Rishi */}
          <View
            style={[
              styles.levelRow,
              stats.minutes >= 500 && styles.activeLevel,
            ]}
          >
            <View
              style={[styles.dot, stats.minutes >= 500 ? styles.dotActive : {}]}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.levelTitle,
                  stats.minutes >= 500 && { color: Colors.premium.gold },
                ]}
              >
                Rishi (Master)
              </Text>
              <Text style={styles.levelDesc}>
                500+ Mins • Enlightened Soul.
              </Text>
            </View>
            {stats.minutes >= 500 && (
              <View style={styles.currentBadge}>
                <Text style={styles.badgeText}>YOU</Text>
              </View>
            )}
          </View>
        </View>

        {/* 3. STATS GRID (Glassmorphism) */}
        <View style={styles.gridContainer}>
          {/* Streak */}
          <View style={styles.glassBox}>
            <Text style={styles.emoji}>🔥</Text>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          {/* Minutes */}
          <View style={styles.glassBox}>
            <Text style={styles.emoji}>⏳</Text>
            <Text style={styles.statValue}>{stats.minutes}</Text>
            <Text style={styles.statLabel}>Mins Focused</Text>
          </View>
        </View>

        {/* 4. SETTINGS MENU */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {/* Upgrade Plan Button */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/paywall")}
          >
            <View style={styles.menuLeft}>
              <Ionicons
                name="star-outline"
                size={22}
                color={Colors.premium.gold}
              />
              <Text style={[styles.menuText, { color: Colors.premium.gold }]}>
                Upgrade Plan
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.premium.gold}
            />
          </TouchableOpacity>

          {/* Notification Toggle */}
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications-outline" size={22} color="#ccc" />
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: "#333", true: Colors.premium.gold }}
              thumbColor={"#fff"}
              value={true}
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push("/downloads")}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="cloud-download-outline" size={22} color="#ccc" />
              <Text style={styles.menuText}>Downloads</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  async function saveName() {
    if (!newName.trim()) {
      setIsEditing(false);
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ full_name: newName })
          .eq("id", user.id);
        setIsEditing(false);
        getProfile(); // Refresh UI
        Alert.alert("Updated", "Your spiritual name has been changed.");
      }
    } catch (e) {
      console.log("Update failed", e);
    }
  }
}

// Helper component for menu items
function MenuOption({ icon, label }: { icon: any; label: string }) {
  return (
    <TouchableOpacity style={styles.menuRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
        <Ionicons name={icon} size={22} color="#A1A1AA" />
        <Text style={styles.menuText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#333" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { paddingBottom: 100, paddingTop: 60 },

  // Header
  header: { alignItems: "center", marginBottom: 30 },
  avatarWrapper: { position: "relative", marginBottom: 15 },
  avatarRing: { padding: 3, borderRadius: 60 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  levelBadge: {
    position: "absolute",
    bottom: -5,
    alignSelf: "center",
    backgroundColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#555",
  },
  levelText: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  username: { color: "#fff", fontSize: 24, fontWeight: "700" },
  premiumTag: {
    marginTop: 8,
    backgroundColor: Colors.premium.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumText: { fontSize: 10, fontWeight: "900", color: "#000" },

  // Edit Mode
  editContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  editInput: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#666",
    minWidth: 150,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: Colors.premium.gold,
    padding: 5,
    borderRadius: 20,
  },

  // Gold Card
  goldCard: {
    marginHorizontal: 20,
    height: 100,
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  goldCardContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 25,
  },
  goldLabel: {
    color: "#665c26",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  goldValue: { color: "#4a4008", fontSize: 32, fontWeight: "900" },
  iconBg: {
    width: 50,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  // Grid
  gridContainer: {
    flexDirection: "row",
    gap: 15,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  glassBox: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  emoji: { fontSize: 24, marginBottom: 5 },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#888", fontSize: 12, marginTop: 2 },

  // Menu
  menuContainer: { paddingHorizontal: 20 },
  sectionTitle: {
    color: "#666",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 18,
    borderRadius: 16,
    marginBottom: 10,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  menuText: { color: "#fff", fontSize: 16, fontWeight: "500" },

  logoutBtn: { marginTop: 20, alignItems: "center", padding: 15 },
  logoutText: { color: "#FF453A", fontWeight: "700" },

  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
  },
  activeLevel: {
    borderColor: Colors.premium.gold,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#333",
    marginRight: 15,
    borderWidth: 2,
    borderColor: "#000",
  },
  dotActive: { backgroundColor: Colors.premium.gold, borderColor: "#fff" },
  levelTitle: { color: "#888", fontWeight: "700", fontSize: 16 },
  levelDesc: { color: "#666", fontSize: 12, marginTop: 2 },
  currentBadge: {
    backgroundColor: Colors.premium.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 10, fontWeight: "bold", color: "#000" },
});
