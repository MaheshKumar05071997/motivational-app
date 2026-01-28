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
import Animated, { FadeInDown, Layout, ZoomIn } from "react-native-reanimated";
import { usePlayer } from "../PlayerContext";

// --- REVAMPED: PREMIUM GLASS CARD COMPONENT ---
const FavoriteCard = ({
  item,
  index,
  isPlaying,
  isActive,
  onPress,
  onRemove,
  onToggle, // <--- ADD THIS
}: any) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)
        .springify()
        .damping(12)}
      layout={Layout.springify()}
      style={{ marginBottom: 12 }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.cardContainer, isActive && styles.activeCardBorder]}
      >
        <BlurView intensity={30} tint="dark" style={styles.cardGlass}>
          {/* 1. Number Index (Subtle) */}
          <Text style={styles.indexText}>{index + 1}</Text>

          {/* 2. Image with Pulse Overlay */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.image_url }} style={styles.cardImage} />
            {isActive && (
              <View style={styles.playingOverlay}>
                <Ionicons name="stats-chart" size={14} color="#000" />
              </View>
            )}
          </View>

          {/* 3. Text Info */}
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
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isActive && (
                <Text
                  style={{
                    color: Colors.premium.gold,
                    fontSize: 10,
                    fontWeight: "bold",
                    marginRight: 6,
                  }}
                >
                  PLAYING •
                </Text>
              )}
              <Text style={styles.cardMeta}>
                {Math.floor(item.duration_sec / 60)}:
                {(item.duration_sec % 60).toString().padStart(2, "0")} mins
              </Text>
            </View>
          </View>

          {/* 4. Actions */}
          <View style={styles.actionRow}>
            {/* Un-Favorite Button (Filled Heart) */}
            <TouchableOpacity onPress={onRemove} style={styles.actionBtn}>
              <Ionicons name="heart" size={18} color="#FF453A" />
            </TouchableOpacity>

            {/* Play Button (Gold Accent) */}
            <TouchableOpacity
              onPress={onToggle} // <--- Calls the new inline function
              style={[
                styles.playBtn,
                isActive && { backgroundColor: Colors.premium.gold },
              ]}
            >
              <Ionicons
                name={isActive && isPlaying ? "pause" : "play"}
                size={16}
                color={isActive ? "#000" : "#FFF"}
                style={{ marginLeft: isActive ? 0 : 2 }}
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
    togglePlayPause, // <--- ADD THIS
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

  const handleInlinePlay = (item, index) => {
    // A. If same song, just toggle play/pause
    if (currentTrack?.id === item.id) {
      togglePlayPause();
      return;
    }

    // B. If new song, play it BUT DO NOT NAVIGATE
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
  };

  return (
    <View style={styles.container}>
      {/* 1. Header (FIXED POSITION) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleSmall}>My Collection</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.premium.gold}
          style={{ marginTop: 100 }}
        />
      ) : (
        <Animated.FlatList
          key={refreshKey}
          data={favorites}
          keyExtractor={(item: any) => item.id}
          itemLayoutAnimation={Layout.springify()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          // 2. Big Title Section
          ListHeaderComponent={
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={{ marginBottom: 25, marginTop: 10 }}
            >
              <Text style={styles.pageTitle}>Liked Gems 💎</Text>
              <Text style={styles.pageSub}>
                Your personal vault of {favorites.length} audio moments.
              </Text>
            </Animated.View>
          }
          // 3. Empty State
          ListEmptyComponent={
            <Animated.View
              entering={ZoomIn.delay(300)}
              style={styles.emptyContainer}
            >
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="heart-dislike-outline"
                  size={40}
                  color="rgba(255,255,255,0.3)"
                />
              </View>
              <Text style={styles.emptyText}>No favorites yet.</Text>
              <Text style={styles.emptySubText}>
                Go explore and save what moves you.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/explore")}
                style={styles.exploreBtn}
              >
                <Text style={styles.exploreBtnText}>Discover Audio</Text>
              </TouchableOpacity>
            </Animated.View>
          }
          // 4. Render Item
          renderItem={({ item, index }: any) => {
            const isActive = currentTrack?.id === item.id;
            return (
              <FavoriteCard
                item={item}
                index={index}
                isActive={isActive}
                isPlaying={isPlaying}
                onPress={() => handlePlay(item, index)}
                onRemove={() => handleRemove(item)}
                onToggle={() => handleInlinePlay(item, index)} // <--- ADD THIS
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent", // Keeps your live background visible
  },

  // --- HEADER STYLES (Fixed) ---
  header: {
    paddingTop: 60, // <--- CRITICAL FIX for Status Bar
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

  // --- PAGE TITLE ---
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  pageTitle: {
    color: "#FFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  pageSub: {
    color: "#888",
    fontSize: 15,
    marginTop: 5,
  },

  // --- CARD STYLES (Revamped) ---
  cardContainer: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.4)", // Darker, more premium base
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  activeCardBorder: {
    borderColor: Colors.premium.gold,
    backgroundColor: "rgba(20,20,20,0.6)",
  },
  cardGlass: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  indexText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    fontWeight: "700",
    width: 25,
    textAlign: "center",
  },
  imageContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#222",
    marginRight: 15,
  },
  cardImage: { width: "100%", height: "100%" },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.premium.gold,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },
  infoContainer: { flex: 1, justifyContent: "center", gap: 3 },
  cardTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardMeta: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "500",
  },

  // --- ACTIONS ---
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 10,
  },
  actionBtn: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "rgba(255,69,58,0.1)", // Subtle Red tint
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // --- EMPTY STATE ---
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    padding: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  emptyText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  emptySubText: {
    color: "#888",
    fontSize: 14,
    marginTop: 5,
    marginBottom: 25,
    textAlign: "center",
  },
  exploreBtn: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    backgroundColor: Colors.premium.gold,
    borderRadius: 30,
    shadowColor: Colors.premium.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  exploreBtnText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
