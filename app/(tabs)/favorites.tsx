import { Colors } from "@/constants/theme";
import { supabase } from "@/supabaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { usePlayer } from "../PlayerContext";

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    playTrackList,
    currentTrack,
    isPlaying,
    toggleFavorite,
    likedTrackIds,
  } = usePlayer();

  useFocusEffect(
    useCallback(() => {
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
        <Text style={styles.title}>Saved Insights 🧠</Text>
      </Animated.View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.premium.gold}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item, index }) => {
            const isActive = currentTrack && currentTrack.id === item.id;
            return (
              <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
              >
                <TouchableOpacity onPress={() => handlePlay(item, index)}>
                  <View style={[styles.row, isActive && styles.activeRow]}>
                    {/* ALBUM ART */}
                    <Image
                      source={{
                        uri:
                          item.image_url || "https://via.placeholder.com/100",
                      }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        marginRight: 15,
                      }}
                    />
                    <View style={styles.info}>
                      <Text
                        style={[
                          styles.songTitle,
                          isActive && { color: Colors.premium.gold },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {/* Safety Check added for duration */}
                      <Text style={styles.duration}>
                        {Math.floor((item.duration_sec || 0) / 60)}:
                        {((item.duration_sec || 0) % 60)
                          .toString()
                          .padStart(2, "0")}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 15,
                      }}
                    >
                      {/* Delete/Heart Button */}
                      <TouchableOpacity onPress={() => toggleFavorite(item)}>
                        <Ionicons name="heart" size={22} color="#FF453A" />
                      </TouchableOpacity>

                      <Ionicons
                        name={isActive && isPlaying ? "pause" : "play"}
                        size={20}
                        color={isActive ? Colors.premium.gold : "#fff"}
                      />
                    </View>
                  </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    marginRight: 15,
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)", // Darker for white text
    borderWidth: 1,
    borderColor: "transparent", // <--- Invisible by default
    overflow: "hidden",
  },
  activeRow: {
    borderColor: Colors.premium.gold,
    borderWidth: 1,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
  },
  info: { flex: 1 },
  songTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  duration: { color: "#888", fontSize: 12, marginTop: 4 },
});
