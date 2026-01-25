import { Colors } from "@/constants/theme";
import { supabase } from "@/supabaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur"; // <--- ADD THIS
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  ZoomIn,
} from "react-native-reanimated";
import { usePlayer } from "../PlayerContext";

// --- NEW: PREMIUM GLASS CARD COMPONENT ---
const FavoriteCard = ({
  item,
  index,
  isPlaying,
  isActive,
  onPress,
  onRemove,
}: any) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)
        .springify()
        .damping(12)}
      layout={Layout.springify()} // Animate when items are removed
      style={{ marginBottom: 15 }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.cardContainer, isActive && styles.activeCardBorder]}
      >
        <BlurView intensity={20} tint="dark" style={styles.cardGlass}>
          {/* 1. Image with Active Indicator */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
            {isActive && (
              <View style={styles.playingOverlay}>
                <Ionicons name="bar-chart" size={16} color="#FFF" />
              </View>
            )}
          </View>

          {/* 2. Text Info */}
          <View style={styles.infoContainer}>
            <Text
              style={[
                styles.cardTitle,
                isActive && { color: Colors.premium.gold },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.cardArtist} numberOfLines={1}>
              {isActive ? "Now Playing..." : "Saved Audio"}
            </Text>
          </View>

          {/* 3. Actions (Play/Remove) */}
          <View style={styles.actionRow}>
            {/* Play Button */}
            <View
              style={[
                styles.iconBtn,
                isActive && { backgroundColor: Colors.premium.gold },
              ]}
            >
              <Ionicons
                name={isActive && isPlaying ? "pause" : "play"}
                size={18}
                color={isActive ? "#000" : "#FFF"}
              />
            </View>

            {/* Remove Button (Heart Break) */}
            <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
              <Ionicons
                name="heart-dislike-outline"
                size={20}
                color="rgba(255,255,255,0.4)"
              />
            </TouchableOpacity>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // <--- NEW: For Animation Reset
  const {
    playTrackList,
    currentTrack,
    isPlaying,
    toggleFavorite,
    likedTrackIds,
  } = usePlayer();

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((prev) => prev + 1); // <--- FIX: Triggers animation on every visit
      fetchFavorites();
    }, []),
  );

  async function fetchFavorites() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("favorites")
        .select("audios(*)") // Join with audios
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }); // Newest first

      if (error) throw error;

      const songs = data.map((item) => item.audios).filter(Boolean);
      setFavorites(songs);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  // --- FIX: Instant Remove Logic ---
  const handleRemove = (item) => {
    setFavorites((prev) => prev.filter((t) => t.id !== item.id)); // 1. Remove from UI instantly
    toggleFavorite(item); // 2. Update DB in background
  };

  const handlePlay = (item, index) => {
    // Format for player
    const allTracks = favorites.map((t) => ({
      id: t.id,
      url: t.audio_url,
      title: t.title,
      artist: "Liked Vibe",
      artwork: t.image_url,
      duration: t.duration_sec,
      is_locked: t.is_locked,
    }));

    playTrackList(allTracks, index);
    router.push("/player");
  };

  return (
    <View style={styles.container}>
      {/* Gradient DELETED for video */}

      {/* Header */}
      <Animated.View
        entering={FadeInUp.duration(600).springify()}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        {/*/<Text style={styles.title}>Saved Insights 🧠</Text>*/}
      </Animated.View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.premium.gold}
          style={{ marginTop: 50 }}
        />
      ) : (
        <Animated.FlatList
          key={refreshKey} // <--- FIX: This restarts the animation
          data={favorites}
          keyExtractor={(item: any) => item.id}
          itemLayoutAnimation={Layout.springify()} // Smooth reordering when item removed
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          // Header Component (Your Collection Title)
          ListHeaderComponent={
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={{ marginBottom: 20 }}
            >
              <Text style={styles.headerTitle}>Aapke Favourites</Text>
              <Text style={styles.headerSub}>
                aapke {favorites.length} sabse favorites
              </Text>
            </Animated.View>
          }
          // Empty State (If no favorites)
          ListEmptyComponent={
            <Animated.View
              entering={ZoomIn.delay(300)}
              style={styles.emptyContainer}
            >
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="heart-outline"
                  size={50}
                  color="rgba(255,255,255,0.3)"
                />
              </View>
              <Text style={styles.emptyText}>No treasures found yet.</Text>
              <TouchableOpacity
                onPress={() => router.push("/explore")}
                style={styles.exploreBtn}
              >
                <Text style={styles.exploreBtnText}>Find Motivation</Text>
              </TouchableOpacity>
            </Animated.View>
          }
          // The New Card Renderer
          renderItem={({ item, index }: any) => {
            const isActive = currentTrack?.id === item.id;
            return (
              <FavoriteCard
                item={item}
                index={index}
                isActive={isActive}
                isPlaying={isPlaying}
                onPress={() => handlePlay(item, index)}
                onRemove={() => handleRemove(item)} // <--- FIX: Use new instant remove handler
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },

  // Header
  headerTitle: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 20,
  },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 10 },

  // Premium Card
  cardContainer: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  activeCardBorder: {
    borderColor: Colors.premium.gold,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,215,0,0.05)", // Slight gold tint
  },
  cardGlass: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },

  // Image Section
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#333",
  },
  cardImage: { width: "100%", height: "100%" },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Info Section
  infoContainer: { flex: 1, marginLeft: 15, justifyContent: "center", gap: 4 },
  cardTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  cardArtist: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "500",
  },

  // Actions
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    padding: 8,
  },

  // Empty State
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyText: { color: "#888", fontSize: 16, marginBottom: 20 },
  exploreBtn: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: Colors.premium.gold,
    borderRadius: 25,
  },
  exploreBtnText: { color: "#000", fontWeight: "bold" },
});
