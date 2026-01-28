import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert, // <--- Add this
  Dimensions,
  FlatList,
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
import { Video } from "expo-av";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40; // Makes the card fit the screen minus padding

export default function HomeScreen() {
  const [moods, setMoods] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const router = useRouter();
  // 1. Get currentTrack to check if player is active
  const { playTrackList, toggleFavorite, likedTrackIds, currentTrack } =
    usePlayer();
  // Animation Trigger
  const [triggerKey, setTriggerKey] = useState(0);

  // ... existing state ...
  const [dynamicQuotes, setDynamicQuotes] = useState([
    { text: "Loading wisdom...", author: "" },
  ]);
  const [spotlights, setSpotlights] = useState<any[]>([]); // Change to array
  const flatListRef = React.useRef<FlatList>(null); // To control the scroll
  const [activeIndex, setActiveIndex] = useState(0); // To track current slide
  const [quotes, setQuotes] = useState<any[]>([]);

  useEffect(() => {
    if (spotlights.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % spotlights.length);
    }, 5000); // Rotate every 5 seconds automatically

    return () => clearInterval(interval);
  }, [spotlights.length]);

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
  // --- NEW: Daily Mission State ---
  const [missionCompleted, setMissionCompleted] = useState(false);

  // REPLACE "const dailyTask = ..." WITH THIS:
  const [activeMission, setActiveMission] = useState({
    title: "TODAY'S SANKALP",
    task: "Loading mission...",
    audio_id: null,
  });
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

  async function startDailyMission() {
    try {
      setLoading(true);
      let tracksToPlay = [];

      // A. If Admin set a specific song, play that
      if (activeMission.audio_id) {
        const { data: specificTrack } = await supabase
          .from("audios")
          .select("*")
          .eq("id", activeMission.audio_id)
          .single();
        if (specificTrack) tracksToPlay = [specificTrack];
      }

      // B. Fallback: If no specific song, find a "Morning" track
      if (tracksToPlay.length === 0) {
        const { data: morningTracks } = await supabase
          .from("audios")
          .select("*")
          .ilike("title", "%morning%")
          .limit(5);
        tracksToPlay = morningTracks || [];
      }

      // C. Ultimate Fallback
      if (tracksToPlay.length === 0) {
        const { data: anyTracks } = await supabase
          .from("audios")
          .select("*")
          .limit(5);
        tracksToPlay = anyTracks || [];
      }

      if (tracksToPlay.length > 0) {
        // Format for player AND ADD THE MISSION FLAG
        const formatted = tracksToPlay.map((t) => ({
          id: t.id,
          url: t.audio_url,
          title: t.title,
          artist: "Daily Mission",
          artwork: t.image_url || "https://via.placeholder.com/300",
          duration: t.duration_sec,
          isMission: true, // <--- CRITICAL: Tells PlayerContext to award +50 points on finish
        }));

        await playTrackList(formatted, 0);
        router.push("/player");

        // Removed: setMissionCompleted(true) and DB update
        // We now let the PlayerContext handle the reward when the song actually finishes.
      } else {
        Alert.alert("No Content", "No audio found for this mission.");
      }
    } catch (e) {
      console.log("Mission Error:", e);
    } finally {
      setLoading(false);
    }
  }

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

      // 2. FIXED: Fetch ALL Quotes for TODAY (So they can rotate)
      const today = new Date().toISOString().split("T")[0];

      const { data: q } = await supabase
        .from("home_quotes")
        .select("*")
        .eq("is_active", true)
        .eq("display_date", today); // <--- REMOVED .limit(1)

      // Fallback: If no quote is set for today, fetch the latest 5
      if (!q || q.length === 0) {
        const { data: latest } = await supabase
          .from("home_quotes")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(5); // Fallback to last 5

        if (latest) setDynamicQuotes(latest);
      } else {
        setDynamicQuotes(q);
      }

      // 3. Fetch All Active Spotlights
      const { data: spotlightData } = await supabase
        .from("home_spotlights")
        .select("*")
        .eq("is_active", true);

      if (spotlightData) {
        setSpotlights(spotlightData);
      }

      // 4. NEW: Fetch Today's Mission from DB
      const { data: missionData } = await supabase
        .from("daily_missions")
        .select("*")
        .eq("display_date", today)
        .limit(1) // Ensure we only get one
        .single();

      if (missionData) {
        setActiveMission({
          title: missionData.title || "TODAY'S SANKALP",
          task: missionData.task_label,
          audio_id: missionData.linked_audio_id,
        });
      } else {
        // Fallback if nothing is in DB for today
        setActiveMission({
          title: "TODAY'S SANKALP",
          task: "Listen to 'Morning Boost' for 5 mins",
          audio_id: null,
        });
      }

      // 5. CHECK IF MISSION COMPLETED LOCALLY (Fixes the Green UI issue)
      const storedDate = await AsyncStorage.getItem("mission_completed_date");
      if (storedDate === today) {
        setMissionCompleted(true);
      }

      // 6. Fetch Moods
      const { data: moodData } = await supabase
        .from("home_moods")
        .select("*")
        .eq("is_active", true);
      if (moodData) setMoods(moodData);

      // 7. Fetch Videos
      const { data: vidData } = await supabase
        .from("home_videos")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (vidData) setVideos(vidData);
    } catch (e) {
      console.log("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  } // <--- ADD THIS CLOSING BRACE

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
      {/* 1. FIXED HEADER (First child = Top of screen) */}
      <View
        style={{
          position: "absolute",
          top: 50, // Adjusts for status bar
          left: 20,
          right: 20,
          zIndex: 100, // Forces it above everything
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Back Button Removed for Home */}
        <View style={{ width: 45 }} />
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Image
            source={{ uri: "https://api.dicebear.com/9.x/micah/png?seed=Soul" }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: Colors.premium.gold,
            }}
          />
        </TouchableOpacity>
      </View>

      {/* 2. SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: currentTrack ? 200 : 150, // Extra space for Tabs + Player
          paddingTop: 100, // Pushes content down so it starts BELOW the header
        }}
      >
        {/* ... (Your existing greeting, stats, quotes, etc. go here - NO CHANGES NEEDED inside ScrollView) ... */}

        {/* HEADER: Greeting & Streak */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.header}
        >
          {/* ... existing header content ... */}
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.username}>{userName}</Text>
          </View>
          <BlurView intensity={20} tint="light" style={styles.glassBadge}>
            <Ionicons name="flame" size={24} color="#FF5722" />
            <Text style={styles.streakText}>{streak}</Text>
          </BlurView>
        </Animated.View>

        {/* ... Rest of your ScrollView content ... */}

        {/* HERO CARD: Daily Quote */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>Daily Wisdom</Text>

          <AnimatedGradientCard imageUrl={todaysQuote.image_url}>
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

        {/* 🎯 DAILY SANKALP (MISSION) */}
        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          style={styles.missionWrapper}
        >
          <LinearGradient
            colors={
              missionCompleted
                ? ["#0f9b0f", "#000"]
                : [Colors.premium.gold, "#B8860B"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.missionBorder}
          >
            <View style={styles.missionCard}>
              <View style={styles.missionRow}>
                <View style={styles.missionIcon}>
                  <Ionicons
                    name={
                      missionCompleted
                        ? "checkmark-circle"
                        : "scan-circle-outline"
                    }
                    size={24}
                    color={missionCompleted ? "#4ADE80" : Colors.premium.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  {/* Dynamic Title */}
                  <Text style={styles.missionLabel}>{activeMission.title}</Text>

                  {/* FIX: Show Hinglish Message if Completed */}
                  <Text
                    style={[
                      styles.missionTitle,
                      missionCompleted && {
                        color: "#4ADE80",
                        fontStyle: "italic",
                      },
                    ]}
                  >
                    {missionCompleted
                      ? "Mission Complete! Kal aana for more points. ✨"
                      : activeMission.task}
                  </Text>
                </View>

                {!missionCompleted && (
                  <TouchableOpacity
                    style={styles.claimBtn}
                    onPress={startDailyMission} // <--- CALL THE NEW FUNCTION
                  >
                    <Text style={styles.claimText}>Start</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Reward Badge */}
              {missionCompleted && (
                <View style={styles.rewardRow}>
                  <Text
                    style={{
                      color: "#4ADE80",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    +50 Karma Earned
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ACTION: Start Morning Boost */}
        {/* 🔥 SPOTLIGHT SECTION */}
        {/* 🔥 ROTATING SINGLE WINDOW */}
        <View style={{ marginBottom: 30 }}>
          <Text style={styles.sectionTitle}>Spotlight Insights 💡</Text>
          {spotlights.length > 0 && (
            <Animated.View
              key={`spotlight-${activeIndex}`} // This triggers the bouncy animation on change
              entering={FadeInDown.springify().damping(12).mass(1)}
              style={{ width: CARD_WIDTH, alignSelf: "center" }}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={async () => {
                  const item = spotlights[activeIndex];
                  if (item.linked_audio_id) {
                    const { data } = await supabase
                      .from("audios")
                      .select("*")
                      .eq("id", item.linked_audio_id)
                      .single();
                    if (data && data.url) {
                      await playTrackList([data], 0);
                      router.push("/player");
                    }
                  } else if (item.audio_url && item.audio_url.trim() !== "") {
                    await playTrackList(
                      [
                        {
                          ...item,
                          title: item.title,
                          url: item.audio_url,
                          image_url: item.image_url,
                        },
                      ],
                      0,
                    );
                    router.push("/player");
                  }
                }}
                style={styles.spotlightCard}
              >
                {spotlights[activeIndex].video_url ? (
                  <Video
                    source={{ uri: spotlights[activeIndex].video_url }}
                    style={styles.spotlightImage}
                    resizeMode="cover"
                    shouldPlay
                    isLooping
                    isMuted
                    usePoster
                    posterSource={{ uri: spotlights[activeIndex].image_url }}
                  />
                ) : (
                  <Image
                    source={{
                      uri: spotlights[activeIndex].image_url
                        ? spotlights[activeIndex].image_url
                        : "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop", // Default "Zen" Image
                    }}
                    style={styles.spotlightImage}
                  />
                )}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.9)"]}
                  style={styles.spotlightOverlay}
                >
                  <View style={styles.spotlightTagContainer}>
                    <Text style={styles.spotlightTag}>FEATURED</Text>
                  </View>
                  <Text style={styles.spotlightTitle}>
                    {spotlights[activeIndex].title}
                  </Text>
                  <Text style={styles.spotlightSub}>
                    {spotlights[activeIndex].subtitle}
                  </Text>
                  <View style={styles.playCapsule}>
                    <Ionicons name="play" size={16} color="#000" />
                    <Text style={styles.playText}>Listen Now</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* 🔘 PAGINATION DOTS */}
          <View style={styles.paginationContainer}>
            {spotlights.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  activeIndex === index ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        </View>
        {/* MOOD CHECK-IN */}
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 30 }}
          >
            {moods.length > 0 ? (
              moods.map((m, i) => (
                <MoodChip
                  key={i}
                  label={m.label}
                  icon={m.icon}
                  color={m.color}
                  onPress={() => {
                    if (m.linked_category_id) {
                      // ✅ FIX: Send ONLY the ID. Let the Playlist page fetch the correct name.
                      router.push({
                        pathname: "/(tabs)/playlist",
                        params: {
                          categoryId: m.linked_category_id,
                        },
                      });
                    } else {
                      router.push("/(tabs)/explore");
                    }
                  }}
                />
              ))
            ) : (
              <Text style={{ color: "#666", marginLeft: 20 }}>
                Loading moods...
              </Text>
            )}
          </ScrollView>
        </Animated.View>

        {/* ⏱️ QUICK RESETS */}
        {/* ⏱️ QUICK RESETS (Now Bouncy) */}
        <Animated.View
          entering={FadeInDown.delay(700).springify().damping(12)}
          style={{ marginBottom: 30 }}
        >
          {/* 🎬 SHORT VIDEOS SECTION */}
          {videos.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(650).springify()}
              style={{ marginBottom: 30 }}
            >
              <Text style={styles.sectionTitle}>Daily Shorts 🎬</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 15, paddingRight: 20 }}
              >
                {videos.map((v, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: 140,
                      height: 220,
                      borderRadius: 15,
                      overflow: "hidden",
                      backgroundColor: "#000",
                    }}
                    onPress={() => {
                      // Play video in full screen player or custom modal
                      // For now, we reuse the player but we need a video player screen.
                      // Simplest: Just play the audio if it's music, or use a modal.
                      // Assuming basic video play:
                      router.push({
                        pathname: "/modal",
                        params: { videoUrl: v.video_url },
                      }); // You need a modal screen for this
                      // OR just Alert for now if you don't have a video player screen ready
                      // Alert.alert("Play Video", "Video player implementation needed.");
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          v.thumbnail_url || "https://via.placeholder.com/150",
                      }}
                      style={{ width: "100%", height: "100%" }}
                    />
                    <View
                      style={{ position: "absolute", bottom: 10, left: 10 }}
                    >
                      <Ionicons name="play-circle" size={30} color="#FFF" />
                      <Text
                        style={{
                          color: "#FFF",
                          fontSize: 12,
                          fontWeight: "bold",
                          width: 120,
                        }}
                        numberOfLines={1}
                      >
                        {v.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}
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
// 2. Animated Gradient Card (Now with Image Support) 🦎
function AnimatedGradientCard({ children, imageUrl }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.linear }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return { opacity: opacity.value };
  });

  return (
    <View style={styles.glassCard}>
      {imageUrl ? (
        // --- OPTION A: BACKGROUND IMAGE ---
        <>
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          {/* Dark Overlay (Adjust opacity 0.5 for readability) */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
          />
        </>
      ) : (
        // --- OPTION B: CHAMELEON GRADIENT (Fallback) ---
        <>
          <LinearGradient
            colors={["#8E2DE2", "#4A00E0"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
            <LinearGradient
              colors={["#00c6ff", "#0072ff"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
        </>
      )}

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
  quoteActions: {
    flexDirection: "row",
    marginTop: 15, // Reduced from 20
    justifyContent: "center",
    gap: 10,
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
    padding: 15, // Reduced padding
    borderRadius: 15, // Sharper corners (more rectangular)
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    minHeight: 130, // Reduced height (was 180)
    justifyContent: "center",
  },
  quoteText: {
    fontSize: 18, // Smaller font to fit
    fontWeight: "700",
    color: "#fff",
    marginTop: 10,
    lineHeight: 24,
    fontStyle: "italic",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)", // Shadow helps read over images
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  quoteAuthor: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    textAlign: "center",
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
    position: "absolute", // Ensures video stays in background
  },
  spotlightOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
    justifyContent: "flex-end",
    padding: 25,
    zIndex: 10, // Forces text to the front
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
  // PAGINATION DOT STYLES
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: "#fff",
    width: 20, // Longer dot for the active item
  },
  inactiveDot: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 6,
  },
  moodText: { color: "#fff", fontWeight: "700", marginLeft: 8 },

  catLabel: { fontSize: 12, fontWeight: "bold", marginTop: 5 },
  // --- NEW MISSION STYLES ---
  missionWrapper: {
    marginBottom: 30,
    paddingHorizontal: 5, // Slight indent
  },
  missionBorder: {
    borderRadius: 20,
    padding: 1.5, // Creates the Gold Border effect
  },
  missionCard: {
    backgroundColor: "#121212", // Inner dark bg
    borderRadius: 19,
    padding: 15,
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  missionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  missionLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 2,
  },
  missionTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  claimBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  claimText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  rewardRow: {
    marginTop: 10,
    alignItems: "flex-end",
  },
});
