import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// --- YOUR IMPORTS ---
import { usePlayer } from "@/app/PlayerContext"; // Ensure path is correct
import { Colors } from "@/constants/theme";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../supabaseConfig"; // Ensure path is correct

const { width } = Dimensions.get("window");

// --- LEVEL CONFIGURATION ---
const LEVELS = [
  {
    id: "sadhak",
    name: "Sadhak",
    subtitle: " The Novice",
    minMinutes: 0,
    color: "#4ADE80", // Green
    description: "The journey begins. Discipline is your only friend.",
    avatar: require("@/assets/images/react-logo.png"),
    stickers: [
      {
        id: 1,
        name: "Sitting",
        image: require("@/assets/images/sadhak_01.png"),
      },
      {
        id: 2,
        name: "Walking",
        image: require("@/assets/images/sadhak_02.png"),
      },
      {
        id: 3,
        name: "Reading",
        image: require("@/assets/images/sadhak_03.png"),
      },
    ],
  },
  {
    id: "yogi",
    name: "Yogi",
    subtitle: " The Seeker",
    minMinutes: 100,
    color: Colors.premium.gold, // Gold
    description: "Balance achieved. The mind is a steady flame.",
    avatar: require("@/assets/images/react-logo.png"),
    stickers: [
      {
        id: 4,
        name: "Levitating",
        image: require("@/assets/images/yogi_01.png"),
      },
      { id: 5, name: "Aura", image: require("@/assets/images/yogi_02.png") },
      {
        id: 6,
        name: "Teaching",
        image: require("@/assets/images/yogi_03.png"),
      },
    ],
  },
  {
    id: "siddha",
    name: "Siddha",
    subtitle: " The Proven",
    minMinutes: 500,
    color: "#3B82F6", // Electric Blue
    description: "Mastery over self. You walk the path of fire.",
    avatar: require("@/assets/images/react-logo.png"), // Placeholder
    stickers: [
      { id: 7, name: "Energy", image: require("@/assets/images/yogi_01.png") }, // Placeholder
    ],
  },
  {
    id: "rishi",
    name: "Rishi",
    subtitle: " The Master",
    minMinutes: 2000, // Increased difficulty
    color: "#A855F7", // Purple
    description: "One with the cosmos. Silence is the answer.",
    avatar: require("@/assets/images/react-logo.png"),
    stickers: [
      { id: 8, name: "Cosmic", image: require("@/assets/images/rishi_01.png") },
      {
        id: 9,
        name: "Third Eye",
        image: require("@/assets/images/rishi_02.png"),
      },
      {
        id: 10,
        name: "Nirvana",
        image: require("@/assets/images/rishi_03.png"),
      },
    ],
  },
  {
    id: "moksha",
    name: "Moksha",
    subtitle: " The Legend",
    minMinutes: 5000, // The Ultimate Goal
    color: "#FF4500", // Orange/Red
    description: "Beyond the cycle. You are the source.",
    avatar: require("@/assets/images/react-logo.png"), // Placeholder
    stickers: [
      {
        id: 11,
        name: "Eternal",
        image: require("@/assets/images/rishi_01.png"),
      }, // Placeholder
    ],
  },
];

// --- COMPONENT: SHIMMER EFFECT (Diagonal & Continuous) ---
const Shimmer = ({ style }: { style?: any }) => {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1200 }), // Faster for "Always" feel
      -1, // Infinite loop
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }, style]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }} // Diagonal Gradient
          style={{ flex: 1, transform: [{ skewX: "-20deg" }] }} // Skew for motion effect
        />
      </Animated.View>
    </View>
  );
};

// --- COMPONENT: STICKER ITEM (Updated for Images) ---
// --- COMPONENT: STICKER ITEM (Fixed: Fills Circle) ---
const StickerItem = ({
  name,
  image,
  locked,
}: {
  name: string;
  image?: any;
  locked: boolean;
}) => (
  <View style={styles.stickerContainer}>
    <View style={[styles.stickerCircle, locked && styles.stickerLocked]}>
      {locked ? (
        <MaterialCommunityIcons name="lock" size={24} color="#555" />
      ) : (
        <Image
          source={image}
          style={{ width: "100%", height: "100%", resizeMode: "cover" }}
        />
      )}
    </View>
    <Text style={[styles.stickerText, locked && { color: "#555" }]}>
      {name}
    </Text>
  </View>
);

// --- COMPONENT: LEVEL CARD ---
const LevelCard = ({
  level,
  currentMinutes,
  isCurrentLevel,
  onOpenGallery,
}: any) => {
  const isLocked = currentMinutes < level.minMinutes;
  // If it's unlocked but NOT the current level, it's a "Passed" level (should be dimmer)
  const isPassed = !isLocked && !isCurrentLevel;

  // Animation: Current = 1, Passed = 0.7, Locked = 0.5
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isLocked ? 0.5 : isPassed ? 0.7 : 1);

  useEffect(() => {
    // 1. UPDATE OPACITY: Dim 'Passed' levels to 0.5, Keep 'Current' at 1
    opacity.value = withTiming(isLocked ? 0.5 : isPassed ? 0.5 : 1, {
      duration: 500,
    });

    // 2. PULSE ANIMATION: Only for Current Level
    if (isCurrentLevel) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1500 }),
          withTiming(1, { duration: 1500 }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(1); // Reset scale for others
    }
  }, [isCurrentLevel, isLocked, isPassed]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
      <View style={styles.connectorLine} />

      <BlurView
        intensity={isLocked ? 20 : 40}
        tint="dark"
        style={[
          styles.cardBlur,
          isLocked && styles.cardLockedBorder,
          // NEW: Highlight the Current Level with its own color border & glow
          isCurrentLevel && {
            borderColor: level.color,
            borderWidth: 2,
            backgroundColor: "rgba(0,0,0,0.6)", // Darker background to make the content POP
            shadowColor: level.color,
            shadowOpacity: 0.5,
            shadowRadius: 10,
          },
        ]}
      >
        {/* Main Card Content */}
        <View style={styles.cardHeader}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <Image
              source={level.avatar}
              style={[styles.mainAvatar, isLocked && { tintColor: "gray" }]}
              resizeMode="contain"
            />
            {isLocked && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={24} color="#FFF" />
              </View>
            )}
          </View>

          {/* Text Section */}
          <View style={styles.textContainer}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={[
                  styles.levelTitle,
                  { color: isLocked ? "#888" : level.color },
                ]}
              >
                {level.name}
                <Text style={styles.levelSubtitle}>{level.subtitle}</Text>
              </Text>
              {isLocked && (
                <View style={styles.minutesBadge}>
                  <Text style={styles.minutesText}>
                    {level.minMinutes} mins
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.levelDesc}>{level.description}</Text>

            {!isLocked && (
              <View style={styles.unlockedBadge}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={14}
                  color={Colors.premium.gold}
                />
                <Text style={styles.unlockedText}>Unlocked</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stickers / Actions Section */}
        {!isLocked ? (
          <View style={styles.stickersSection}>
            <View style={styles.divider} />
            <Text style={styles.stickersHeader}>
              <MaterialCommunityIcons
                name="star-four-points"
                size={12}
                color={Colors.premium.gold}
              />{" "}
              Unlocked Avatars
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 15, gap: 15 }}
            >
              {level.stickers.map((s: any) => (
                <StickerItem
                  key={s.id}
                  name={s.name}
                  image={s.image} // <--- THIS IS THE KEY CHANGE
                  locked={false}
                />
              ))}
              <TouchableOpacity
                onPress={() => onOpenGallery(level)}
                style={styles.morePlaceholder}
              >
                <Text style={styles.moreText}>+ More</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.lockedFooter}>
            <Text style={styles.lockedFooterText}>
              Reach{" "}
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                {level.minMinutes} mins
              </Text>{" "}
              to unlock {level.stickers.length} exclusive stickers.
            </Text>
          </View>
        )}
        {!isLocked && <Shimmer style={{ opacity: 0.1 }} />}
      </BlurView>
    </Animated.View>
  );
};

// --- COMPONENT: PREMIUM COUNTDOWN ---
function PremiumTimer({ expiry, router }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!expiry) return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(expiry);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m`);
      }
    };

    updateTimer(); // Run immediately
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [expiry]);

  if (!expiry || timeLeft === "Expired") return null;

  return (
    <TouchableOpacity
      onPress={() => router.push("/paywall")}
      activeOpacity={0.9}
      style={{
        marginHorizontal: 20,
        marginBottom: 20, // Space below header
        padding: 15,
        borderRadius: 15,
        backgroundColor: "#1A1A1A",
        borderWidth: 1,
        borderColor: Colors.premium.gold,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: Colors.premium.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            backgroundColor: Colors.premium.gold,
            padding: 8,
            borderRadius: 20,
          }}
        >
          <Ionicons name="hourglass" size={20} color="#000" />
        </View>
        <View>
          <Text
            style={{
              color: Colors.premium.gold,
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            {timeLeft} Remaining
          </Text>
          <Text style={{ color: "#888", fontSize: 12 }}>
            Enjoying premium? Lock it in before it’s gone
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.premium.gold} />
    </TouchableOpacity>
  );
}

// --- MAIN PROFILE SCREEN ---

export default function ProfileScreen() {
  const router = useRouter();
  // ... existing state ...
  const [activeGalleryLevel, setActiveGalleryLevel] = useState<any>(null); // Controls the Modal
  const {
    playTrackList,
    isPremium,
    subscriptionExpiry,
    isLifetime,
    showAlert,
  } = usePlayer(); // <--- FIX: Get Real Status from Global Context

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Soul"); // <--- FIX: Defaults to Soul instead of text "Loading..."
  const [userEmail, setUserEmail] = useState("");
  // New State for Personal Details
  const [hobby, setHobby] = useState("");
  const [occupation, setOccupation] = useState("");

  // Stats
  const [stats, setStats] = useState({
    streak: 0,
    minutes: 0,
    points: 0,
    level: "Sadhak",
  });

  const [favorites, setFavorites] = useState<any[]>([]);

  // NEW: Profile & Premium
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // const [isPremium, setIsPremium] = useState(false); <--- REMOVED: Conflict with Global Context

  // --- IMAGE PICKER ---
  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setAvatarUrl(result.assets[0].uri); // Optimistic Update

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Prepare FormData
        const formData = new FormData();
        formData.append("file", {
          uri: result.assets[0].uri,
          name: "avatar.png",
          type: "image/png",
        } as any);

        const fileName = `${user.id}/avatar_${Date.now()}.png`;

        // 1. Upload to Supabase 'avatars' bucket
        const { error: uploadError } = await supabase.storage
          .from("avatars") // Make sure this bucket exists in Supabase!
          .upload(fileName, formData, { upsert: true });

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: publicData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        // 3. Update Profile Table
        await supabase
          .from("profiles")
          .update({ avatar_url: publicData.publicUrl })
          .eq("id", user.id);
      }
    } catch (e) {
      console.log("Upload Error:", e);
      Alert.alert("Upload Failed", "Please ensure 'avatars' bucket exists.");
    }
  }

  // Edit Name
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");

  // --- DATA FETCHING (From your original file) ---
  useFocusEffect(
    useCallback(() => {
      getProfile();
      getFavorites();
    }, []),
  );

  async function getProfile() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user?.email || "");
      // FIX: Set default name immediately so it never gets stuck on "Loading..."
      setDisplayName(user.email?.split("@")[0] || "Soul");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        // 1. Set Basic Info
        setDisplayName(data.full_name || user.email?.split("@")[0] || "Soul");
        setAvatarUrl(data.avatar_url);
        // Load new details (if they exist)
        setHobby(data.hobby || "");
        setOccupation(data.occupation || "");

        // 2. RESTORED: Calculate Level Logic
        const mins = data.total_minutes || 0;

        // Find the highest level where user's minutes >= level.minMinutes
        // We reverse the array to check from highest (Moksha) to lowest (Sadhak)
        const currentLevelObj =
          [...LEVELS].reverse().find((l) => mins >= l.minMinutes) || LEVELS[0];
        const currentLevel = currentLevelObj.name;

        // 3. RESTORED: Update Screen Stats
        setStats({
          streak: data.streak_count || 0,
          minutes: mins,
          points: data.points || 0,
          level: currentLevel,
        });
      }
    } catch (error) {
      console.log("Profile Error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function getFavorites() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select("audios(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) {
      const songs = data.map((item) => item.audios).filter(Boolean);
      setFavorites(songs);
    }
  }

  // --- ACTIONS ---
  async function saveDetails() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Update all fields in Supabase
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: displayName,
            hobby: hobby,
            occupation: occupation,
          })
          .eq("id", user.id);

        if (error) throw error;

        // Show Custom Glass Alert
        showAlert({
          title: "Profile Updated ✅",
          message: "Your personal details have been saved successfully.",
          icon: "checkmark-circle",
          primaryText: "Great",
        });
        setIsEditing(false);
      }
    } catch (e) {
      console.log("Update failed", e);
      showAlert({
        title: "Error",
        message: "Could not save details. Check your connection.",
        icon: "alert-circle",
        primaryText: "OK",
      });
    }
  }

  async function testNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Test Notification",
          body: "Your notifications are working perfectly.",
          sound: true,
        },
        trigger: { seconds: 2, channelId: "default" } as any,
      });
      Alert.alert("Success", "Wait 2 seconds...");
    } catch (error) {
      Alert.alert(
        "Notice",
        "Notifications may not work in Expo Go on Android.",
      );
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  // --- CALCULATE ACTIVE LEVEL INDEX ---
  const currentLevelIndex = LEVELS.reduce((acc, lvl, idx) => {
    if (stats.minutes >= lvl.minMinutes) return idx;
    return acc;
  }, 0);

  // --- NEW: CHECK FOR STREAK CELEBRATION (Runs every time you focus this tab) ---
  useFocusEffect(
    useCallback(() => {
      checkStreakCelebration();
    }, []),
  );

  async function checkStreakCelebration() {
    try {
      const streakVal = await AsyncStorage.getItem(
        "streak_celebration_pending",
      );
      if (streakVal) {
        // 1. Show the Celebration In-App Notification
        showAlert({
          title: "Streak Increased! 🔥",
          message: `Incredible! You just reached a ${streakVal}-Day Streak!`,
          icon: "flame",
          primaryText: "Let's Go!",
        });

        // 2. Clear the flag immediately so it only shows ONCE
        await AsyncStorage.removeItem("streak_celebration_pending");
      }
    } catch (e) {
      console.log("Streak Check Error:", e);
    }
  }

  // --- RENDER ---
  return (
    <View style={styles.container}>
      {/* Global Live Background shows through here */}

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 2. HEADER & EDIT NAME */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.header}
          >
            <View>
              <Text style={styles.pageTitle}>My Journey</Text>

              {/* User Name with Premium Badge */}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                {isEditing ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.editInput}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="New Name"
                      autoFocus
                    />
                    <TouchableOpacity onPress={saveName} style={styles.saveBtn}>
                      <Ionicons
                        name="checkmark-circle"
                        size={28}
                        color={Colors.premium.gold}
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setNewName(displayName);
                      setIsEditing(true);
                    }}
                  >
                    <Text style={styles.userSubtitle}>
                      {displayName}{" "}
                      <Ionicons name="pencil" size={14} color="#666" />
                    </Text>
                  </TouchableOpacity>
                )}

                {/* PREMIUM BADGE */}
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <MaterialCommunityIcons
                      name="crown"
                      size={12}
                      color="#000"
                    />
                    <Text style={styles.premiumBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Profile Pic Upload */}
            <TouchableOpacity onPress={pickImage} style={styles.headerAvatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={24} color="#FFF" />
              )}
              <View style={styles.editAvatarBadge}>
                <Ionicons name="camera" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>
          </Animated.View>
          {/* ✅ ONLY SHOW IF: Premium + Not Lifetime + Has Expiry Date */}
          {isPremium && !isLifetime && subscriptionExpiry && (
            <PremiumTimer expiry={subscriptionExpiry} router={router} />
          )}

          {/* 3. GOLD STATS CARD */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.statsCardContainer}
          >
            <LinearGradient
              colors={[Colors.premium.gold, "#B8860B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsCard}
            >
              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statsLabel}>KARMA POINTS</Text>
                  <Text style={styles.statsValue}>
                    {stats.points.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="crown" size={28} color="#FFF" />
                </View>
              </View>

              {/* --- SHOP BUTTON --- */}
              <TouchableOpacity
                onPress={() => router.push("/shop")}
                style={{
                  backgroundColor: "#1A1A1A",
                  marginHorizontal: 20,
                  marginTop: 20,
                  padding: 15,
                  borderRadius: 15,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderWidth: 1,
                  borderColor: Colors.premium.gold,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "rgba(255,215,0,0.1)",
                      padding: 8,
                      borderRadius: 20,
                    }}
                  >
                    <Ionicons
                      name="cart"
                      size={20}
                      color={Colors.premium.gold}
                    />
                  </View>
                  <View>
                    <Text
                      style={{
                        color: "#FFF",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      Karma Store
                    </Text>
                    <Text style={{ color: "#888", fontSize: 12 }}>
                      Spend points to unlock features
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <View style={styles.statsDivider} />

              <View style={styles.statsRowSecondary}>
                <View style={styles.statItem}>
                  <Text style={styles.statValSmall}>{stats.minutes}m</Text>
                  <Text style={styles.statLblSmall}>Focused</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValSmall}>{stats.streak}</Text>
                  <Text style={styles.statLblSmall}>Day Streak</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValSmall}>{stats.level}</Text>
                  <Text style={styles.statLblSmall}>Rank</Text>
                </View>
              </View>

              <Shimmer style={{ opacity: 0.2 }} />
            </LinearGradient>
          </Animated.View>

          {/* 4. SPIRITUAL PATH (The Levels) */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.pathHeader}
          >
            <Text style={styles.sectionTitle}>Spiritual Path</Text>
            <View style={styles.helperBadge}>
              <Ionicons name="information-circle" size={14} color="#FFF" />
              <Text style={styles.helperText}>Unlock to get stickers</Text>
            </View>
          </Animated.View>

          <View style={styles.pathContainer}>
            {LEVELS.map((lvl, index) => (
              <Animated.View
                key={lvl.id}
                entering={FadeInDown.delay(400 + index * 150).springify()}
              >
                <LevelCard
                  level={lvl}
                  currentMinutes={stats.minutes}
                  isCurrentLevel={index === currentLevelIndex}
                  onOpenGallery={setActiveGalleryLevel} // <--- Added this
                />
              </Animated.View>
            ))}
          </View>

          {/* 5. FAVORITES / TOP PICKS (Restored functionality) */}
          {favorites.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(600).springify()}
              style={{ marginTop: 30 }}
            >
              <Text style={styles.sectionTitle}>Top Picks</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 20 }}
              >
                {favorites.map((song, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.favCard}
                    onPress={() => playTrackList([song], 0)}
                  >
                    <Image
                      source={{ uri: song.image_url }}
                      style={styles.favImage}
                    />
                    <View style={styles.favOverlay}>
                      <Ionicons name="play-circle" size={24} color="#FFF" />
                    </View>
                    <Text style={styles.favTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* 6. SETTINGS & MENU (Restored functionality) */}
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>
            Preferences
          </Text>

          {/* Premium Button */}
          <TouchableOpacity
            style={[styles.menuItem, isPremium && { opacity: 0.7 }]}
            onPress={() => !isPremium && router.push("/paywall")}
            disabled={isPremium}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="diamond" size={22} color={Colors.premium.gold} />
              <View>
                <Text style={[styles.menuText, { color: Colors.premium.gold }]}>
                  {isPremium ? "Premium Active" : "Premium Plan"}
                </Text>
                {isPremium && (
                  <Text style={{ color: "#666", fontSize: 10 }}>
                    You are already a premium user
                  </Text>
                )}
              </View>
            </View>
            {!isPremium && (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.premium.gold}
              />
            )}
          </TouchableOpacity>

          {/* Downloads Button (RESTORED) */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/downloads")}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="cloud-download-outline" size={22} color="#fff" />
              <Text style={styles.menuText}>My Downloads</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          {/* --- ACCOUNT SETTINGS --- */}
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>
              Personal Details
            </Text>

            {/* 1. NAME INPUT */}
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="person-circle-outline" size={22} color="#888" />
                <TextInput
                  style={{ color: "#FFF", fontSize: 16, width: 200 }}
                  placeholder="Your Name"
                  placeholderTextColor="#555"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>
              <Ionicons name="pencil" size={14} color="#333" />
            </View>

            {/* 2. HOBBY INPUT */}
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="bicycle-outline" size={22} color="#888" />
                <TextInput
                  style={{ color: "#FFF", fontSize: 16, width: 200 }}
                  placeholder="Your Hobby (e.g. Yoga)"
                  placeholderTextColor="#555"
                  value={hobby}
                  onChangeText={setHobby}
                />
              </View>
              <Ionicons name="pencil" size={14} color="#333" />
            </View>

            {/* 3. OCCUPATION INPUT */}
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Ionicons name="briefcase-outline" size={22} color="#888" />
                <TextInput
                  style={{ color: "#FFF", fontSize: 16, width: 200 }}
                  placeholder="Occupation (e.g. Student)"
                  placeholderTextColor="#555"
                  value={occupation}
                  onChangeText={setOccupation}
                />
              </View>
              <Ionicons name="pencil" size={14} color="#333" />
            </View>

            {/* SAVE BUTTON */}
            <TouchableOpacity
              onPress={saveDetails}
              style={{
                backgroundColor: Colors.premium.gold,
                padding: 12,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 30,
                marginTop: 5,
              }}
            >
              <Text style={{ color: "#000", fontWeight: "bold" }}>
                Save Details
              </Text>
            </TouchableOpacity>

            {/* --- DANGER ZONE (RED BLOCK) --- */}
            <Text
              style={[
                styles.sectionTitle,
                { marginBottom: 10, color: "#FF453A" },
              ]}
            >
              Danger Zone
            </Text>

            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  backgroundColor: "rgba(255, 69, 58, 0.1)", // Red Tint
                  borderColor: "rgba(255, 69, 58, 0.3)", // Red Border
                  borderWidth: 1,
                },
              ]}
              onPress={() => {
                // USE WEBSITE THEME ALERT (Not Baby School Style)
                showAlert({
                  title: "Delete Account?",
                  message:
                    "Are you sure? This will delete your progress, karma, and data PERMANENTLY.",
                  icon: "warning",
                  primaryText: "DELETE",
                  onPrimaryPress: async () => {
                    // Secure Delete Logic
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (user) {
                      await supabase
                        .from("profiles")
                        .delete()
                        .eq("id", user.id);
                      await supabase.auth.signOut();
                      router.replace("/auth");
                    }
                  },
                  secondaryText: "Cancel",
                });
              }}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="trash-outline" size={22} color="#FF453A" />
                <Text style={[styles.menuText, { color: "#FF453A" }]}>
                  Delete Account
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FF453A" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>DISCONNECT SOUL (LOGOUT)</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
      {/* --- STICKER GALLERY MODAL --- */}
      {activeGalleryLevel && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0,0,0,0.9)",
              zIndex: 100,
              padding: 20,
              paddingTop: 60,
            },
          ]}
        >
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />

          {/* Close Button */}
          <TouchableOpacity
            style={{ position: "absolute", top: 50, right: 20, zIndex: 10 }}
            onPress={() => setActiveGalleryLevel(null)}
          >
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>

          {/* Gallery Content */}
          <Text
            style={{
              color: activeGalleryLevel.color,
              fontSize: 24,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {activeGalleryLevel.name} Gallery
          </Text>
          <Text
            style={{ color: "#888", textAlign: "center", marginBottom: 30 }}
          >
            Collection of {activeGalleryLevel.stickers.length} Avatars
          </Text>

          <ScrollView
            contentContainerStyle={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 20,
            }}
          >
            {activeGalleryLevel.stickers.map((s: any) => (
              <View key={s.id} style={{ alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.2)",
                  }}
                >
                  <Image
                    source={s.image}
                    style={{
                      width: "100%",
                      height: "100%",
                      resizeMode: "cover",
                    }}
                  />
                </View>
                <Text style={{ color: "#FFF", fontSize: 12 }}>{s.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent", // <--- Now it's invisible, so balls show through!
  },
  orb: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    blurRadius: 100,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  userSubtitle: {
    fontSize: 14,
    color: "#CCC",
    marginTop: 2,
    fontWeight: "600",
  },
  headerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  // Edit Name
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 10,
  },
  editInput: {
    backgroundColor: "#222",
    color: "#FFF",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 150,
    fontSize: 14,
  },
  saveBtn: {
    padding: 2,
  },

  // Stats Card
  statsCardContainer: {
    marginBottom: 35,
    borderRadius: 24,
    shadowColor: Colors.premium.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  statsCard: {
    padding: 20,
    borderRadius: 24,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 1,
  },
  statsValue: {
    color: "#FFF",
    fontSize: 36,
    fontWeight: "900",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 15,
  },
  statsRowSecondary: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
  },
  statValSmall: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  statLblSmall: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },

  // Path Section
  pathHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
  helperBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  helperText: {
    color: "#DDD",
    fontSize: 10,
    fontWeight: "600",
  },
  pathContainer: {
    gap: 20,
  },

  // Level Card
  cardWrapper: {
    marginBottom: 10,
  },
  connectorLine: {
    position: "absolute",
    top: -30,
    left: 40,
    width: 2,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    zIndex: -1,
  },
  cardBlur: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(30,30,40,0.6)",
  },
  cardLockedBorder: {
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  cardHeader: {
    flexDirection: "row",
    padding: 15,
    gap: 15,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mainAvatar: {
    width: 60,
    height: 60,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  levelSubtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#AAA",
  },
  levelDesc: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  minutesBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  minutesText: {
    color: "#AAA",
    fontSize: 10,
    fontWeight: "bold",
  },
  unlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  unlockedText: {
    color: Colors.premium.gold,
    fontSize: 12,
    fontWeight: "bold",
  },

  // Stickers / Actions
  stickersSection: {
    paddingBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 15,
    marginBottom: 10,
  },
  stickersHeader: {
    color: "#CCC",
    fontSize: 11,
    marginLeft: 15,
    marginBottom: 10,
    fontWeight: "600",
  },
  stickerContainer: {
    alignItems: "center",
    gap: 5,
  },
  stickerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden", // <--- MAKE SURE THIS IS HERE
  },
  stickerLocked: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.05)",
  },
  stickerText: {
    color: "#FFF",
    fontSize: 10,
  },
  morePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.premium.gold,
    borderStyle: "dashed",
    alignItems: "center",
    zIndex: 10, // <--- ADD THIS
    justifyContent: "center",
  },
  moreText: {
    color: Colors.premium.gold,
    fontSize: 10,
    fontWeight: "bold",
  },
  lockedFooter: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 10,
    alignItems: "center",
  },
  lockedFooterText: {
    color: "#888",
    fontSize: 11,
  },

  // Favorites
  favCard: {
    width: 100,
    gap: 5,
  },
  favImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#333",
  },
  favOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 20, // offset title
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
  },
  favTitle: {
    color: "#CCC",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  // Settings Menu
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 18,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  menuText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutBtn: {
    marginTop: 20,
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#FF453A",
    borderRadius: 30,
    marginHorizontal: 50,
  },
  logoutText: {
    color: "#FF453A",
    fontWeight: "700",
    letterSpacing: 1,
    fontSize: 12,
  },
  // ... existing styles ...

  // NEW STYLES
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.premium.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    marginLeft: 5,
  },
  premiumBadgeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "bold",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: Colors.premium.gold,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
});
