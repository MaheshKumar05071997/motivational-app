import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePlayer } from "../../app/PlayerContext";
import { supabase } from "../../supabaseConfig";
// Add these to your imports
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function HomeScreen() {
  const router = useRouter();
  const { playTrackList, toggleFavorite, likedTrackIds } = usePlayer();
  // Animation Trigger
  const [triggerKey, setTriggerKey] = useState(0);

  // ... existing state ...
  const [dynamicQuotes, setDynamicQuotes] = useState([
    { text: "Loading wisdom...", author: "" },
  ]);
  const [spotlight, setSpotlight] = useState<any>(null); // <--- For the Spotlight Card

  // Re-trigger animation on Focus
  useFocusEffect(
    useCallback(() => {
      setTriggerKey((prev) => prev + 1);
    }, []),
  );

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // Use dynamicQuotes instead of hardcoded quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % dynamicQuotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [dynamicQuotes]); // Add dependency

  const todaysQuote = dynamicQuotes[currentQuoteIndex] || dynamicQuotes[0];
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Friend");
  const [greeting, setGreeting] = useState("Good Morning,"); // <--- NEW STATE

  // Helper to check time
  const updateGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good Morning,");
    else if (hrs < 17) setGreeting("Good Afternoon,");
    else setGreeting("Good Evening,");
  };

  // Triggered every time you visit the tab
  useFocusEffect(
    useCallback(() => {
      setTriggerKey((prev) => prev + 1); // Replay animations
      updateGreeting(); // Update Greeting
      fetchUserData(); // Update Name & Streak
    }, []),
  );

  async function fetchUserData() {
    try {
      // 1. Fetch User Profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, streak_count")
          .eq("id", user.id)
          .single();

        if (data) {
          setUserName(data.full_name || user.email?.split("@")[0] || "Friend");
          setStreak(data.streak_count || 0);
        }
      }

      // 2. Fetch Dynamic Quotes
      const { data: quoteData } = await supabase
        .from("home_quotes")
        .select("text, author")
        .eq("is_active", true);

      if (quoteData && quoteData.length > 0) {
        setDynamicQuotes(quoteData);
      }

      // 3. Fetch Active Spotlight
      const { data: spotlightData } = await supabase
        .from("home_spotlights")
        .select("*")
        .eq("is_active", true)
        .single();

      if (spotlightData) {
        setSpotlight(spotlightData);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }

  const handleShareQuote = async () => {
    try {
      await Share.share({
        message: `"${todaysQuote.text}" - Shared via Motivation App`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const playDailyBoost = async () => {
    // Fetch 5 random tracks for "Morning Boost"
    const { data } = await supabase.from("audios").select("*").limit(5);
    if (data && data.length > 0) {
      // Shuffle them (simple random sort)
      const shuffled = data.sort(() => 0.5 - Math.random());
      await playTrackList(shuffled, 0);
      router.push("/player");
    }
  };

  return (
    <View style={styles.container}>
      {/* ScrollView key={triggerKey} ensures animation replay on focus */}
      <ScrollView
        key={triggerKey} // This forces the animations to replay on focus
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* HEADER: Greeting & Streak */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.header}
        >
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.username}>{userName}</Text>
          </View>
          <BlurView intensity={20} tint="light" style={styles.glassBadge}>
            <Ionicons name="flame" size={24} color="#FF5722" />
            <Text style={styles.streakText}>{streak}</Text>
          </BlurView>
        </Animated.View>

        {/* HERO CARD: Daily Quote */}
        {/* LIVING GRADIENT QUOTE CARD */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>Daily Wisdom</Text>

          <AnimatedGradientCard>
            <Ionicons
              //name="sparkles"
              size={30}
              color="rgba(255,255,255,0.8)"
              style={styles.quoteIcon}
            />
            {/* Animated Text Fader */}
            <Animated.View
              key={currentQuoteIndex} // Re-animate text when quote changes
              entering={FadeInDown.duration(500)}
            >
              <Text style={styles.quoteText}>{todaysQuote.text}</Text>
              <Text style={styles.quoteAuthor}>- {todaysQuote.author}</Text>
            </Animated.View>

            <View style={styles.quoteActions}>
              <TouchableOpacity
                onPress={handleShareQuote}
                style={styles.actionGlassBtn}
              >
                <Ionicons name="share-social" size={18} color="#fff" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionGlassBtn}>
                <Ionicons name="heart" size={18} color="#fff" />
                <Text style={styles.actionText}>Save</Text>
              </TouchableOpacity>
            </View>
          </AnimatedGradientCard>
        </Animated.View>

        {/* ACTION: Start Morning Boost */}
        {/* 🔥 SPOTLIGHT SECTION */}
        {/* 🔥 DYNAMIC SPOTLIGHT SECTION */}
        {spotlight && (
          <Animated.View
            entering={FadeInDown.delay(500).springify().damping(12)}
            style={{ marginTop: 10, marginBottom: 30 }}
          >
            <Text style={styles.sectionTitle}>Spotlight Insight 💡</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                // If linked to audio, navigate to player
                if (spotlight.audio_url || spotlight.linked_audio_id) {
                  router.push("/player");
                }
              }}
              style={styles.spotlightCard}
            >
              <Image
                source={{ uri: spotlight.image_url }}
                style={styles.spotlightImage}
              />

              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.9)"]}
                style={styles.spotlightOverlay}
              >
                <View style={styles.spotlightTagContainer}>
                  <Text style={styles.spotlightTag}>FEATURED</Text>
                </View>
                <Text style={styles.spotlightTitle}>{spotlight.title}</Text>
                <Text style={styles.spotlightSub}>{spotlight.subtitle}</Text>

                <View style={styles.playCapsule}>
                  <Ionicons name="play" size={16} color="#000" />
                  <Text style={styles.playText}>Listen Now</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
        {/* MOOD CHECK-IN */}
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 30 }}
          >
            {/* Quick Mood Chips */}
            <MoodChip
              label="Stressed"
              icon="thunderstorm"
              color="#FF6B6B"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/playlist",
                  params: { categoryId: 1, categoryName: "Anxiety Relief" },
                })
              }
            />
            <MoodChip
              label="Tired"
              icon="battery-dead"
              color="#546E7A"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/playlist",
                  params: { categoryId: 3, categoryName: "Morning Energy" },
                })
              }
            />
            <MoodChip
              label="Anxious"
              icon="water"
              color="#48dbfb"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/playlist",
                  params: { categoryId: 1, categoryName: "Anxiety Relief" },
                })
              }
            />
            <MoodChip
              label="Sad"
              icon="cloud"
              color="#a29bfe"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/playlist",
                  params: { categoryId: 8, categoryName: "Broken Heart" },
                })
              }
            />
          </ScrollView>
        </Animated.View>

        {/* ⏱️ QUICK RESETS */}
        {/* ⏱️ QUICK RESETS (Now Bouncy) */}
        <Animated.View
          entering={FadeInDown.delay(700).springify().damping(12)}
          style={{ marginBottom: 30 }}
        >
          <Text style={styles.sectionTitle}>Short on Time? ⚡</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { title: "Instant Calm", time: "2 min", color: "#48dbfb" },
              { title: "Focus Now", time: "4 min", color: "#ff9f43" },
              { title: "Sleep Prep", time: "5 min", color: "#5f27cd" },
              { title: "Ego Check", time: "3 min", color: "#ff6b6b" },
            ].map((item, index) => (
              <TouchableOpacity key={index} style={styles.quickCard}>
                <View
                  style={[styles.quickIcon, { backgroundColor: item.color }]}
                >
                  <Ionicons name="play" size={14} color="#fff" />
                </View>
                <View>
                  <Text style={styles.quickTitle}>{item.title}</Text>
                  <Text style={styles.quickTime}>{item.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* SHORTCUTS: Categories (Now Bouncy) */}
        <Animated.View entering={FadeInDown.delay(900).springify().damping(12)}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Explore</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoryGrid}>
            <CategoryShortcut label="Energy" icon="sunny" color="#feca57" />
            <CategoryShortcut label="Sleep" icon="moon" color="#5f27cd" />
            <CategoryShortcut label="Focus" icon="pulse" color="#ff9f43" />
            <CategoryShortcut label="Anxiety" icon="water" color="#48dbfb" />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// Mini Component for Mood Chips
function MoodChip({ label, icon, color, onPress }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <BlurView intensity={20} tint="dark" style={styles.moodChip}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.moodText}>{label}</Text>
      </BlurView>
    </TouchableOpacity>
  );
}

// Mini Component for Categories
function CategoryShortcut({ label, icon, color }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[
        styles.catCard,
        { backgroundColor: color + "20", overflow: "hidden" },
      ]}
      onPress={() => router.push("/(tabs)/explore")}
    >
      <ShimmerEffect />
      <Ionicons name={icon} size={28} color={color} />
      <Text style={[styles.catLabel, { color: color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// 1. Shimmer Effect Component (The "Light Strike")
function ShimmerEffect() {
  const translateX = useSharedValue(-100);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(150, { duration: 1500, easing: Easing.linear }), // Slide across
        withDelay(3000, withTiming(150, { duration: 0 })), // Wait 3s, then reset instantly
      ),
      -1, // Infinite loop
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 40,
          backgroundColor: "rgba(255,255,255,0.3)",
          transform: [{ skewX: "-20deg" }],
          zIndex: 1,
        },
        animatedStyle,
      ]}
    />
  );
}

// 2. Animated Gradient Card (The Chameleon Crossfade Fix) 🦎
function AnimatedGradientCard({ children }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Fade up and down continuously over 6 seconds
    opacity.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.linear }),
      -1,
      true, // Reverse: 0 -> 1 -> 0
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return { opacity: opacity.value };
  });

  return (
    <View style={styles.glassCard}>
      {/* LAYER 1: Base Gradient (Purple/Pink) - Always Visible */}
      <LinearGradient
        colors={["#8E2DE2", "#4A00E0"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* LAYER 2: Overlay Gradient (Cyan/Blue) - Fades In & Out */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={["#00c6ff", "#0072ff"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Content sits on top */}
      <View style={{ zIndex: 10 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    //backgroundColor: "#121212",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  greeting: { color: "#888", fontSize: 16 },
  username: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  streakText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 5,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },

  // Quote Card
  quoteCard: {
    padding: 25,
    borderRadius: 24,
    marginBottom: 30,
    position: "relative",
  },
  quoteIcon: { position: "absolute", top: 15, left: 15, marginBottom: 50 },
  quoteText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginTop: 0,
    lineHeight: 0,
    fontStyle: "italic",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 20,
  },
  quoteAuthor: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginTop: 10,
    opacity: 0.7,
    textAlign: "right",
  },
  quoteActions: { flexDirection: "row", marginTop: 20, gap: 15 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: { color: "#000", fontWeight: "600", marginLeft: 5, fontSize: 12 },

  // Play Card
  playCard: {
    height: 120,
    borderRadius: 20,
    marginBottom: 30,
    backgroundColor: "#000",
  },
  playBg: { flex: 1, justifyContent: "center" },
  playContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  playIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  playTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  playSub: { color: "#ddd", fontSize: 14 },

  // Categories
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  seeAll: { color: Colors.premium.gold, fontSize: 14, fontWeight: "600" },
  categoryGrid: { flexDirection: "row", justifyContent: "space-between" },
  catCard: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  // Add/Replace these in StyleSheet.create
  glassBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  glassCard: {
    padding: 25,
    borderRadius: 24,
    marginBottom: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  quoteText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff", // White text looks better on glass
    marginTop: 20,
    lineHeight: 32,
    fontStyle: "italic",
  },
  quoteAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    marginTop: 15,
    textAlign: "right",
  },
  actionGlassBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  actionText: { color: "#fff", fontWeight: "600", marginLeft: 5, fontSize: 12 },

  // Mood Chip Helper Style
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  // SPOTLIGHT STYLES
  spotlightCard: {
    width: "100%",
    height: 350,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  spotlightImage: {
    width: "100%",
    height: "100%",
  },
  spotlightOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    justifyContent: "flex-end",
    padding: 25,
  },
  spotlightTagContainer: {
    backgroundColor: "#D4AF37", // Gold
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  spotlightTag: {
    color: "#000",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 1,
  },
  spotlightTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  spotlightSub: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  playCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  playText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 14,
  },

  // QUICK CARD STYLES
  quickCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 15,
    borderRadius: 15,
    marginRight: 15,
    width: 160,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  quickIcon: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  quickTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  quickTime: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  moodText: { color: "#fff", fontWeight: "700", marginLeft: 8 },

  catLabel: { fontSize: 12, fontWeight: "bold", marginTop: 5 },
});
