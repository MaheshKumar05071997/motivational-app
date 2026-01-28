import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text, // <--- ADD THIS
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { usePlayer } from "../../app/PlayerContext"; // <--- To play search results

import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue, // <--- NEW
  withDelay, // <--- NEW
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "../../supabaseConfig";

const { width } = Dimensions.get("window");

export default function ExploreScreen() {
  const router = useRouter();
  // Get isPremium to check lock status
  // Added currentTrack to check for padding
  const { playTrackList, isPremium, currentTrack } = usePlayer();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(text) {
    setQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);

    try {
      // Step 1: Find Categories that match the search term
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", `%${text}%`);

      const catIds = catData ? catData.map((c) => c.id) : [];

      // Step 2: Find Audios that match Title OR belong to those Categories
      let queryBuilder = supabase.from("audios").select("*");

      if (catIds.length > 0) {
        // Syntax: Title match OR Category ID match
        queryBuilder = queryBuilder.or(
          `title.ilike.%${text}%,category_id.in.(${catIds.join(",")})`,
        );
      } else {
        queryBuilder = queryBuilder.ilike("title", `%${text}%`);
      }

      const { data } = await queryBuilder.limit(20);
      setSearchResults(data || []);
    } catch (err) {
      console.log("Search Error:", err);
    }
  }

  const handlePlaySearch = (item) => {
    // 1. Security Check
    if (item.is_locked && !isPremium) {
      router.push("/paywall");
      return;
    }

    // 2. FIX: Map Supabase data to Player format
    const track = {
      id: item.id,
      url: item.audio_url, // <--- CRITICAL FIX (Maps audio_url to url)
      title: item.title,
      artist: "Explore", // Default artist name
      artwork: item.image_url,
      is_locked: item.is_locked,
      duration: item.duration_sec,
    };

    // 3. Play
    playTrackList([track], 0);
    router.push("/player");
  };
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // FIXED: Refetch categories every time you open this tab
  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, []),
  );

  async function fetchCategories() {
    try {
      // Fetch Real Data from Supabase
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true }); // Alphabetical or you can add a 'rank' column later

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.log("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Background removed to show Live Orb Wallpaper */}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: currentTrack ? 160 : 100 }, // <--- Dynamic Padding
        ]}
      >
        {/* 1. NEW HEADER (Like Favorites) */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitleSmall}>Explore</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 2. BIG TITLES */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={{ paddingHorizontal: 20, marginBottom: 20 }}
        >
          <Text style={styles.title}>Realms 🪐</Text>
          <Text style={styles.subtitle}>Where will you travel today?</Text>
        </Animated.View>

        {/* 3. NEW GLASS PILL SEARCH BAR */}
        <View style={{ paddingHorizontal: 20, marginBottom: 25 }}>
          <BlurView intensity={20} tint="light" style={styles.glassSearch}>
            <Ionicons
              name="search"
              size={20}
              color="#CCC"
              style={{ marginRight: 10 }}
            />
            <TextInput
              placeholder="Search specific vibrations..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.searchInput}
              value={query}
              onChangeText={handleSearch}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </BlurView>
        </View>

        {/* --- SEARCH RESULTS LIST --- */}
        {isSearching && (
          <View style={{ marginBottom: 40, minHeight: 300 }}>
            <Text style={styles.sectionTitle}>
              Found {searchResults.length} Speeches
            </Text>
            {searchResults.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 50)}
              >
                <TouchableOpacity
                  onPress={() => handlePlaySearch(item)}
                  style={styles.resultItem}
                >
                  <View style={{ position: "relative", marginRight: 15 }}>
                    {/* ALBUM ARTWORK */}
                    <Image
                      source={{
                        uri:
                          item.image_url || "https://via.placeholder.com/100",
                      }}
                      style={{
                        width: 55,
                        height: 55,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.2)",
                      }}
                    />
                    {/* Play Overlay */}
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(0,0,0,0.3)",
                        borderRadius: 10,
                      }}
                    >
                      <Ionicons name="play" size={20} color="#fff" />
                    </View>

                    {/* Lock Badge ONLY if NOT Premium */}
                    {item.is_locked && !isPremium && (
                      <View
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          backgroundColor: "#000",
                          borderRadius: 10,
                          padding: 2,
                        }}
                      >
                        <Ionicons
                          name="lock-closed"
                          size={12}
                          color="#FF453A"
                        />
                      </View>
                    )}
                  </View>

                  <View style={{ marginLeft: 15, flex: 1 }}>
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                    >
                      {item.title}
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {/* Show 'PREMIUM' label only if locked (optional: hide if user is premium to make it feel standard) */}
                      {item.is_locked && !isPremium && (
                        <Text
                          style={{
                            color: "#FFD700",
                            fontSize: 10,
                            marginRight: 5,
                            fontWeight: "bold",
                          }}
                        >
                          PREMIUM •
                        </Text>
                      )}
                      <Text style={{ color: "#666", fontSize: 12 }}>
                        Tap to listen
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#444" />
                </TouchableOpacity>
              </Animated.View>
            ))}
            {searchResults.length === 0 && (
              <Text
                style={{ color: "#666", textAlign: "center", marginTop: 20 }}
              >
                No speech found...
              </Text>
            )}
          </View>
        )}
        {/* --- SEARCH BAR END --- */}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={Colors.premium.gold}
            style={{ marginTop: 50 }}
          />
        ) : (
          <View style={styles.grid}>
            {/* HIDE GRID WHEN SEARCHING */}
            {!isSearching &&
              categories.map((item, index) => (
                <ShimmerCard
                  key={item.id}
                  item={item}
                  index={index}
                  color={getSmartColor(item.name)} // <--- ADD THIS LINE
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/playlist",
                      params: { categoryId: item.id, categoryName: item.name },
                    })
                  }
                />
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Helper to give distinct colors to cards based on index (until DB has colors)
function getCategoryColor(index) {
  const colors = [
    "#FF6B6B", // Red/Pink
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#96C93D", // Green
    "#FFA07A", // Salmon
    "#9B59B6", // Purple
    "#34495E", // Dark Blue
    "#F1C40F", // Yellow
  ];
  return colors[index % colors.length] + "CC"; // Adding transparency
}
// --- 3. ALIVE CARD COMPONENT (Floating + Pulse + Shimmer) ---
// --- 3. ALIVE CARD COMPONENT (Rainbow + Floating + Diagonal Shimmer) ---
// --- 3. ALIVE CARD COMPONENT (Distinct Rainbows + Diagonal Shimmer) ---
// --- 3. ALIVE CARD COMPONENT (Wide Portal Style) ---
function ShimmerCard({ item, index, onPress, color }) {
  // Movement Values
  const translateX = useSharedValue(-200);

  React.useEffect(() => {
    const delay = Math.random() * 2000 + 500;
    translateX.value = withRepeat(
      withSequence(
        withDelay(
          delay,
          withTiming(400, { duration: 1500, easing: Easing.linear }),
        ),
        withTiming(-200, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedBgStyle = useAnimatedStyle(() => ({
    backgroundColor: color || "#555",
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: "-45deg" }, { translateX: translateX.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={{ marginBottom: 15, width: "100%" }} // <--- Full Width
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={{
          height: 100, // <--- Sleek Height
          borderRadius: 20,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.15)",
        }}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, animatedBgStyle, { opacity: 0.8 }]}
        />

        {/* Content Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: "100%",
            paddingHorizontal: 20,
          }}
        >
          {/* Left Icon */}
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: "rgba(0,0,0,0.2)",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 15,
            }}
          >
            <Ionicons name={item.icon || "planet"} size={26} color="#fff" />
          </View>

          {/* Text Middle */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#FFF",
                fontSize: 18,
                fontWeight: "bold",
                letterSpacing: 0.5,
              }}
            >
              {item.name}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              OPEN PORTAL
            </Text>
          </View>

          {/* Right Arrow */}
          <Ionicons
            name="chevron-forward"
            size={24}
            color="rgba(255,255,255,0.3)"
          />
        </View>

        {/* Shimmer Overlay */}
        <Animated.View style={[styles.shimmerBar, shimmerStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.3)", "transparent"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // --- NEW HEADER STYLES ---
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  backBtn: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  headerTitleSmall: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    marginTop: 5,
  },

  // --- NEW SEARCH BAR ---
  glassSearch: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 25, // Pill Shape
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.3)", // Dark Glass Base
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    height: "100%",
  },

  // --- RESULTS ---
  sectionTitle: {
    color: "#888",
    marginBottom: 10,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 20,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30,30,30,0.8)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 20,
  },

  // --- GRID REMOVED (Now a List) ---
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Shimmer Bar for Animation
  shimmerBar: {
    width: 200,
    height: "200%",
    top: -50,
    left: -50,
  },
});

// Add these new styles to your StyleSheet
const extraStyles = {
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    height: "100%",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  sectionTitle: {
    color: "#888",
    marginBottom: 10,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
};
// --- SMART COLOR LOGIC FOR 4 PILLARS ---
function getSmartColor(name: string) {
  const n = name.toLowerCase();

  // Pillar 1: Morning / Energy (Gold/Orange)
  if (
    n.includes("morning") ||
    n.includes("energy") ||
    n.includes("gym") ||
    n.includes("power")
  )
    return "#FFD700"; // Gold
  if (n.includes("focus") || n.includes("work") || n.includes("study"))
    return "#FFA500"; // Orange

  // Pillar 2: Sleep / Night (Dark Blues)
  if (
    n.includes("sleep") ||
    n.includes("night") ||
    n.includes("nidra") ||
    n.includes("dream")
  )
    return "#1A237E"; // Deep Blue
  if (n.includes("rain") || n.includes("calm") || n.includes("relax"))
    return "#483D8B"; // Slate Blue

  // Pillar 3: Emotion / Healing (Teal/Pink)
  if (n.includes("anxiety") || n.includes("stress") || n.includes("peace"))
    return "#008080"; // Teal
  if (n.includes("heart") || n.includes("sad") || n.includes("heal"))
    return "#FF6B6B"; // Soft Red

  // Pillar 4: Spiritual (Purple/Saffron)
  if (
    n.includes("god") ||
    n.includes("mantra") ||
    n.includes("chant") ||
    n.includes("shiva")
  )
    return "#FF9933"; // Saffron
  if (n.includes("soul") || n.includes("meditation") || n.includes("mind"))
    return "#9C27B0"; // Purple

  // Default Fallback
  return "#333";
}
Object.assign(styles, extraStyles);
