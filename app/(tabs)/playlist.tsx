import { Colors } from "@/constants/theme";
import { supabase } from "@/supabaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { usePlayer } from "../PlayerContext";

export default function PlaylistScreen() {
  const { categoryId } = useLocalSearchParams();
  // Start with a placeholder so we know if it's loading
  const [pageTitle, setPageTitle] = useState("Loading...");
  const router = useRouter();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ FIX: Get 'isPremium' from Global Context (which handles 24h logic correctly)
  // ✅ FIX: Get 'showAlert' too
  const { playTrackList, currentTrack, isPlaying, isPremium, showAlert } =
    usePlayer();

  useEffect(() => {
    if (categoryId) {
      setTracks([]); // <--- CLEAR OLD SONGS
      setLoading(true);
      fetchTracks();
    }
  }, [categoryId]);

  async function fetchTracks() {
    try {
      if (!categoryId) return;

      // 1. Fetch Category Name
      const { data: catData } = await supabase
        .from("categories")
        .select("name")
        .eq("id", categoryId)
        .single();

      if (catData) {
        setPageTitle(catData.name);
      } else {
        setPageTitle("Unknown Series");
      }

      // 2. Fetch Tracks
      // Now that Admin Panel sends Strings, this will match the UUID correctly.
      let { data, error } = await supabase
        .from("audios")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: true });

      if (error) {
        console.log("Track Fetch Error:", error.message);
      }

      setTracks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handlePlayTrack = (track, index) => {
    // 1. Check if locked
    if (track.is_locked && !isPremium) {
      showAlert({
        title: "Premium Content 🔒",
        message:
          "This ancient wisdom is reserved for Premium souls. Unlock it now?",
        icon: "diamond", // Custom Icon!
        primaryText: "Unlock Now",
        onPrimaryPress: () => router.push("/paywall"),
        secondaryText: "Later",
        onSecondaryPress: () => console.log("Cancelled"),
      });
      return;
    }

    // 2. THE FIX: Convert "audio_url" (Database Name) to "url" (Player Name)
    const formattedTracks = tracks.map((t) => ({
      id: t.id,
      url: t.audio_url, // <--- THIS MAPS IT CORRECTLY
      title: t.title,
      artist: "Motivation", // Default artist since DB doesn't have one yet
      artwork: t.image_url, // Maps image_url to artwork
      duration: t.duration_sec,
      is_locked: t.is_locked, // <--- ADD THIS LINE!
    }));

    // 3. Play the formatted list
    playTrackList(formattedTracks, index);
    router.push("/player");
  };

  return (
    <View style={styles.container}>
      {/* Gradient DELETED for video */}

      {/* 🎬 SERIES HERO SECTION */}
      <View style={styles.heroContainer}>
        {/* 1. The Cover Image */}
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1519681393798-2f43f1f20769?q=80&w=2600&auto=format&fit=crop", // Placeholder: "Dark Night Sky"
          }}
          style={styles.heroImage}
        />

        {/* 2. The Dark Overlay (So text pops) */}
        <View style={styles.heroOverlay} />

        {/* 3. The Back Button (Floating on top) */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.floatingBackBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* 4. The Series Info */}
        <View style={styles.heroContent}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>PREMIUM SERIES</Text>
          </View>

          {/* ✅ FIX: Remove hardcoded 'Mindset Series' fallback */}
          <Text style={styles.heroTitle}>{pageTitle}</Text>
          <Text style={styles.heroDescription}>
            A curated collection of audio mentorship to help you reset, refocus,
            and rebuild your inner strength.
          </Text>

          {/* 5. The "Start Series" Action Button */}
          <TouchableOpacity
            style={styles.playAllButton}
            onPress={() => {
              if (tracks.length > 0) handlePlayTrack(tracks[0], 0);
            }}
          >
            <Ionicons name="play" size={20} color="#000" />
            <Text style={styles.playAllText}>START SERIES</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.premium.gold} />
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isActive = currentTrack && currentTrack.id === item.id;

            return (
              <Animated.View
                entering={FadeInDown.delay(index * 100)
                  .duration(600)
                  .springify()}
              >
                <TouchableOpacity
                  onPress={() => handlePlayTrack(item, index)}
                  activeOpacity={0.7}
                >
                  <BlurView
                    intensity={isActive ? 40 : 10}
                    tint="dark"
                    style={[styles.trackRow, isActive && styles.activeTrackRow]}
                  >
                    {/* NEW: Album Art in List */}
                    <Image
                      source={{
                        uri: item.image_url || "https://via.placeholder.com/50",
                      }}
                      style={{
                        width: 45,
                        height: 45,
                        borderRadius: 8,
                        marginRight: 12,
                      }}
                    />
                    <View style={styles.trackIndex}>
                      {isActive && isPlaying ? (
                        <Ionicons
                          name="pulse"
                          size={18}
                          color={Colors.premium.gold}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.indexText,
                            isActive && { color: Colors.premium.gold },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    <View style={styles.trackInfo}>
                      <Text
                        style={[
                          styles.trackTitle,
                          isActive && { color: Colors.premium.gold },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {/* Fixed: DB column is duration_sec */}
                      <Text style={styles.durationText}>
                        {Math.floor((item.duration_sec || 0) / 60)}:
                        {((item.duration_sec || 0) % 60)
                          .toString()
                          .padStart(2, "0")}{" "}
                        mins • Adhyay
                      </Text>
                    </View>

                    {item.is_locked && !isPremium ? (
                      <Ionicons name="lock-closed" size={20} color="#FF4500" />
                    ) : (
                      <View
                        style={[
                          styles.playButton,
                          isActive && { backgroundColor: Colors.premium.gold },
                        ]}
                      >
                        <Ionicons
                          name={isActive ? "pause" : "play"}
                          size={14}
                          color={isActive ? "#000" : "#fff"}
                          style={{ marginLeft: isActive ? 0 : 2 }}
                        />
                      </View>
                    )}
                  </BlurView>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" }, // <--- Changed to transparent
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    paddingTop: 60,
    paddingHorizontal: 25,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  headerContent: { alignItems: "flex-start" },
  categoryLabel: {
    color: Colors.premium.gold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 15,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.premium.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metaText: { fontSize: 12, fontWeight: "700", color: "#000" },

  listContent: { paddingHorizontal: 20, paddingBottom: 150 },

  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderRadius: 16,
    padding: 15,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.5)", // Darker for white text
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  activeTrackRow: {
    borderColor: Colors.premium.gold,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
  },

  trackIndex: {
    width: 30,
    alignItems: "center",
    marginRight: 10,
  },
  indexText: { color: "#666", fontWeight: "700", fontSize: 14 },

  trackInfo: { flex: 1 },
  trackTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  durationText: { color: "#888", fontSize: 12 },

  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  // HERO STYLES
  heroContainer: {
    height: 400, // Tall cinematic header
    width: "100%",
    position: "relative",
    marginBottom: 20,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)", // Darkens image
    // Add a gradient effect manually if needed, but simple opacity works well
  },
  floatingBackBtn: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 25,
    paddingBottom: 40,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)", // Subtle gradient text protection
  },
  tagBadge: {
    backgroundColor: Colors.premium.gold,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  tagText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroDescription: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 25,
    maxWidth: "90%",
  },
  playAllButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  playAllText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
