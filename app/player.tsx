import { Colors } from "@/constants/theme";
import { supabase } from "@/supabaseConfig";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
// ✅ FIXED IMPORT (from your fixed code)
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePlayer } from "./PlayerContext";

const { width } = Dimensions.get("window");

export default function PlayerScreen() {
  // --- DATABASE UPDATE FOR POINTS ---
  // --- DATABASE UPDATE FOR POINTS & MINUTES ---
  async function updateUserStats() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch current stats
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_minutes, points, streak_count") // <--- FETCH POINTS
        .eq("id", user.id)
        .single();

      const currentMins = profile?.total_minutes || 0;
      const currentPoints = profile?.points || 0;
      const currentStreak = profile?.streak_count || 0;

      // 2. LOGIC:
      // Minutes increase by 10 (Session length)
      const newMins = currentMins + 10;

      // Points Logic: 10 pts per session + Streak Bonus
      const bonus = currentStreak > 5 ? 20 : 0; // Bonus if streak > 5
      const newPoints = currentPoints + 100 + bonus; // 100 base pts

      // 3. Update DB
      const { error } = await supabase
        .from("profiles")
        .update({
          total_minutes: newMins,
          points: newPoints, // <--- SAVING SEPARATELY
        })
        .eq("id", user.id);

      if (error) console.log("Points Error:", error.message);
      else console.log(`Stats Updated! Mins: ${newMins}, Pts: ${newPoints}`);
    } catch (e) {
      console.log("Stats Update Failed", e);
    }
  }
  const router = useRouter();

  // --- 1. GET CONTEXT ---
  const {
    currentTrack,
    isPlaying,
    duration,
    position,
    togglePlayPause,
    playNext,
    playPrev,
    seekTo,
    isBuffering,
    queue,
    currentIndex,
    isPremium,
    startSleepTimer, // <--- Import logic
    sleepMinutes, // <--- Import state
    toggleFavorite, // <--- New
    likedTrackIds, // <--- New
    triggerCelebration, // <--- Add this
    setShowCelebration, // <--- ADD THIS LINE
    showAlert,
  } = usePlayer();

  // --- 2. DOWNLOAD STATE & LOGIC (From Fixed Code) ---
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Animation Values
  const breatheScale = useSharedValue(1);

  // A. Breathing Animation Effect (The "Living" Player)
  useEffect(() => {
    if (isPlaying) {
      breatheScale.value = withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
          }), // Inhale
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }), // Exhale
        ),
        -1, // Infinite loop
        true,
      );
    } else {
      breatheScale.value = withTiming(1); // Reset when paused
    }
  }, [isPlaying]);

  // Animated Styles
  const animatedArtStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }],
  }));

  // ✅ SANITIZED FILENAME (Removes special chars like ?, /, :)
  const getLocalPath = (title: string) =>
    FileSystem.documentDirectory + title.replace(/[^a-zA-Z0-9]/g, "_") + ".mp3";

  // ✅ Check helper (Single Source of Truth)
  const checkIfDownloaded = async (track) => {
    if (!track) return false;
    const uri = getLocalPath(track.title);
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  };

  // ✅ FIXED SYNC EFFECT: Runs when track changes
  useEffect(() => {
    let alive = true;

    const sync = async () => {
      if (!currentTrack) {
        setIsDownloaded(false);
        return;
      }

      // Check file system
      const exists = await checkIfDownloaded(currentTrack);
      if (alive) setIsDownloaded(exists);
    };

    sync();

    return () => {
      alive = false;
    };
  }, [currentTrack?.id]); // Watch ID specifically

  // ✅ FIXED DOWNLOAD FUNCTION
  const downloadTrack = async () => {
    if (!currentTrack) return;

    if (currentTrack.is_locked && !isPremium) {
      showAlert({
        title: "Premium Only",
        message: "Subscribe to download this track and listen offline.",
        icon: "lock-closed",
        primaryText: "Go Premium",
        onPrimaryPress: () => router.push("/paywall"),
        secondaryText: "Cancel",
      });
      return;
    }

    try {
      const fileUri = getLocalPath(currentTrack.title);

      // 1. Show "Downloading" Alert
      showAlert({
        title: "Downloading... ☁️",
        message: "Saving track to your library. Please wait.",
        icon: "cloud-download",
        primaryText: "Hide", // Allows user to close if they want
      });

      // Create download resumable
      const downloadResumable = FileSystem.createDownloadResumable(
        currentTrack.url,
        fileUri,
      );

      await downloadResumable.downloadAsync();

      // NEW: Also save the Album Art
      if (currentTrack.artwork) {
        const imageUri = fileUri.replace(".mp3", ".jpg");
        await FileSystem.downloadAsync(currentTrack.artwork, imageUri);
      }

      // Re-check filesystem
      const exists = await checkIfDownloaded(currentTrack);
      setIsDownloaded(exists);

      // 2. Show Success Alert
      setTimeout(() => {
        showAlert({
          title: "Download Complete ✅",
          message: "You can now listen to this track offline.",
          icon: "checkmark-circle",
          primaryText: "Awesome!",
        });
      }, 500); // Small delay to ensure smooth transition
    } catch (e) {
      console.error(e);
      showAlert({
        title: "Download Failed",
        message: "Could not save the track. Please check your connection.",
        icon: "alert-circle",
        primaryText: "Try Again",
      });
    }
  };

  // --- 3. FAVORITES LOGIC (Preserved) ---
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    checkLikeStatus();
  }, [currentTrack?.id]);

  async function checkLikeStatus() {
    if (!currentTrack) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .eq("song_id", currentTrack.id)
      .single();

    setIsLiked(!!data);
  }

  async function toggleLike() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !currentTrack) return;

    if (isLiked) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("song_id", currentTrack.id);
      setIsLiked(false);
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, song_id: currentTrack.id });
      setIsLiked(true);
    }
  }

  // --- 4. UI HELPERS ---
  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  if (!currentTrack) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.premium.gold} />
        <Text style={styles.loadingText}>Loading Track...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* BACKGROUND: Blurred Album Art */}
      <ImageBackground
        source={{
          uri: currentTrack.artwork || "https://via.placeholder.com/400",
        }}
        style={styles.backgroundImage}
        blurRadius={40}
      >
        <View style={styles.overlay}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <Ionicons name="chevron-down" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>MAN KI SHANTI</Text>
            <TouchableOpacity
              style={[
                styles.iconButton,
                sleepMinutes > 0 && { backgroundColor: Colors.premium.gold },
              ]}
              onPress={() => {
                if (sleepMinutes > 0) {
                  // --- CASE A: TIMER IS ALREADY ON ---
                  showAlert({
                    title: "Timer Active ⏳",
                    message:
                      "The music will stop automatically. Do you want to turn it off?",
                    icon: "timer",
                    primaryText: "Turn Off",
                    onPrimaryPress: () => startSleepTimer(0), // 0 means stop
                    secondaryText: "Keep On",
                    onSecondaryPress: () => {}, // Just close alert
                  });
                } else {
                  // --- CASE B: TIMER IS OFF (Show Options) ---
                  showAlert({
                    title: "Sleep Timer 🌙",
                    message: "Set a timer to stop the music.",
                    icon: "moon",
                    primaryText: "30 Mins",
                    onPrimaryPress: () => startSleepTimer(30),
                    secondaryText: "60 Mins",
                    onSecondaryPress: () => startSleepTimer(60),
                  });
                }
              }}
            >
              {/* Show Timer Icon if Active, else Menu Icon */}
              <Ionicons
                name={sleepMinutes > 0 ? "timer" : "ellipsis-horizontal"}
                size={24}
                color={sleepMinutes > 0 ? "#000" : "white"}
              />
            </TouchableOpacity>
          </View>

          {/* ARTWORK (With Shadow & Placeholder Support) */}
          <View style={styles.artContainer}>
            <View style={styles.artWrapper}>
              {/* ALIVE ARTWORK */}
              {currentTrack.artwork ? (
                <Animated.Image
                  source={{ uri: currentTrack.artwork }}
                  style={[styles.hdAlbumArt, animatedArtStyle]} // <--- Added Animation Style
                />
              ) : (
                <View style={[styles.hdAlbumArt, styles.placeholderArt]}>
                  <Ionicons name="musical-notes" size={80} color="#555" />
                </View>
              )}
            </View>
          </View>

          {/* TRACK INFO */}
          <View style={styles.infoContainer}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                paddingHorizontal: 30,
              }}
            >
              {/* Titles */}
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text
                  style={[styles.title, { textAlign: "left" }]}
                  numberOfLines={1}
                >
                  {currentTrack.title}
                </Text>
                <Text style={[styles.artist, { textAlign: "left" }]}>
                  {currentTrack.artist || "Aawaz"}
                </Text>
              </View>

              {/* Download Button */}
              <TouchableOpacity
                onPress={
                  isDownloaded
                    ? () =>
                        showAlert({
                          title: "Library",
                          message: "This track is already downloaded! ✅",
                          icon: "checkmark-circle",
                          primaryText: "Got it",
                        })
                    : downloadTrack
                }
              >
                <Ionicons
                  name={
                    isDownloaded ? "checkmark-circle" : "cloud-download-outline"
                  }
                  size={28}
                  color={isDownloaded ? "#4ADE80" : "#FFF"}
                />
              </TouchableOpacity>

              {/* Like Button removed to avoid duplicate */}
            </View>
          </View>

          {/* PROGRESS SLIDER (With Time Labels) */}
          <View style={styles.progressContainer}>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={duration}
              value={position}
              onSlidingComplete={seekTo}
              minimumTrackTintColor={Colors.premium.gold}
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbTintColor={Colors.premium.gold}
            />
            <View style={styles.timeLabels}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* NEW: Heart Button (Hidden for Offline Tracks) */}
            {currentTrack?.artist !== "Offline Download" ? (
              <TouchableOpacity
                onPress={() => currentTrack && toggleFavorite(currentTrack)}
                style={[styles.controlBtn, { marginRight: 20 }]}
              >
                <Ionicons
                  name={
                    likedTrackIds.has(currentTrack?.id)
                      ? "heart"
                      : "heart-outline"
                  }
                  size={30}
                  color={
                    likedTrackIds.has(currentTrack?.id) ? "#FF453A" : "#888"
                  }
                />
              </TouchableOpacity>
            ) : (
              // Spacer to keep layout balanced when heart is gone
              <View style={{ width: 50, marginRight: 20 }} />
            )}

            <TouchableOpacity onPress={playPrev} style={styles.controlBtn}>
              <Ionicons name="play-skip-back" size={35} color="#fff" />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              onPress={togglePlayPause}
              style={styles.playButton}
            >
              {isBuffering ? (
                <ActivityIndicator color="black" size="small" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={32}
                  color="black"
                  style={{ marginLeft: isPlaying ? 0 : 4 }}
                />
              )}
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity
              onPress={playNext}
              disabled={!queue || currentIndex >= queue.length - 1}
            >
              <Ionicons
                name="play-skip-forward"
                size={35}
                color={
                  !queue || currentIndex >= queue.length - 1
                    ? "rgba(255,255,255,0.2)"
                    : "white"
                }
              />
            </TouchableOpacity>
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: 40 }} />
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "white", marginTop: 20 },

  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 60,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  headerTitle: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },

  artContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 30,
  },
  artWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 25,
  },
  hdAlbumArt: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 40, // Softer, more organic shape
    // borderWidth removed for a cleaner look
  },
  placeholderArt: {
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },

  infoContainer: { alignItems: "center", marginBottom: 30 },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  artist: { color: "#AAA", fontSize: 16, fontWeight: "600" },

  progressContainer: { width: "100%", marginBottom: 40 },
  timeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  timeText: { color: "#CCC", fontSize: 12, fontWeight: "600" },

  controls: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginBottom: 40,
    width: "100%",
  },
  playButton: {
    backgroundColor: Colors.premium.gold,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.premium.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
});
