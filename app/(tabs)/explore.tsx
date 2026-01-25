import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
  interpolateColor,
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
  const { playTrackList, isPremium } = usePlayer();
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

  useEffect(() => {
    fetchCategories();
  }, []);

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <Text style={styles.title}>Explore Realms 🪐</Text>
          <Text style={styles.subtitle}>
            Where do you want to travel mentally today?
          </Text>
        </Animated.View>

        {/* --- SEARCH BAR START --- */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#888"
            style={{ marginRight: 10 }}
          />
          <TextInput
            placeholder="Search for speech..."
            placeholderTextColor="#666"
            style={styles.searchInput}
            value={query}
            onChangeText={handleSearch}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
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
function ShimmerCard({ item, index, onPress }) {
  // Movement Values
  const translateX = useSharedValue(-200); // Start further back for diagonal coverage
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rainbowProgress = useSharedValue(0);

  React.useEffect(() => {
    // A. Shimmer Loop
    const delay = Math.random() * 2000 + 500;
    translateX.value = withRepeat(
      withSequence(
        withDelay(
          delay,
          withTiming(400, { duration: 1500, easing: Easing.linear }),
        ), // Move across
        withTiming(-200, { duration: 0 }), // Reset
      ),
      -1,
      false,
    );

    // B. Floating Loop
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // C. Rainbow Color Loop
    rainbowProgress.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.linear }),
      -1,
      true,
    );
  }, []);

  // 1. Rainbow Style: Use 'index' to shift the colors so they don't match
  const animatedBgStyle = useAnimatedStyle(() => {
    // Offset the progress based on index so each card has a different color at the same time
    const localProgress = (rainbowProgress.value + index * 0.2) % 1;

    const backgroundColor = interpolateColor(
      localProgress,
      [0, 0.2, 0.4, 0.6, 0.8, 1],
      ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96C93D", "#FFA07A", "#FF6B6B"],
    );
    return { backgroundColor };
  });

  // 2. Shimmer Style: Move Diagonally
  const shimmerStyle = useAnimatedStyle(() => ({
    // TRANSFORM ORDER MATTERS: Rotate first, then Translate moves along the new angle
    transform: [{ rotate: "-45deg" }, { translateX: translateX.value }],
  }));

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.cardWrapper}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(0.95))}
        onPressOut={() => (scale.value = withTiming(1))}
      >
        <Animated.View style={[styles.card, animatedBgStyle, floatingStyle]}>
          <View style={styles.iconCircle}>
            <Ionicons name={item.icon || "planet"} size={32} color="#fff" />
          </View>

          <View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>OPEN PORTAL ➔</Text>
          </View>

          {/* Shimmer Effect */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { overflow: "hidden", borderRadius: 25 },
            ]}
            pointerEvents="none"
          >
            <Animated.View style={[styles.shimmerBar, shimmerStyle]}>
              <LinearGradient
                colors={["transparent", "rgba(255,255,255,0.4)", "transparent"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}
// --- 4. FIXED STYLES (All in one place) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    //backgroundColor: "#000",
  },
  scrollContent: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
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
  // Search Styles
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
    marginLeft: 10,
  },
  sectionTitle: {
    color: "#888",
    marginBottom: 10,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
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
  },
  // Card Styles
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: "48%",
    marginBottom: 20,
  },
  card: {
    height: 180,
    borderRadius: 25,
    padding: 20,
    justifyContent: "space-between",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    // Shadows
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 10,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  // Shimmer Style
  shimmerBar: {
    width: 200, // Wider to cover diagonal sweep
    height: "200%", // Taller to cover rotated height
    top: -50, // Start position
    left: -50,
    // Note: Remove any 'transform' here because we handle it in the animation logic now
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
Object.assign(styles, extraStyles);
