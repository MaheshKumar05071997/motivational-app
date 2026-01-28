import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { usePlayer } from "../app/PlayerContext";

export default function MiniPlayer() {
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    position,
    duration,
    playNext,
    playPrev,
    queue,
    currentIndex,
    closePlayer, // <--- Get the close function
  } = usePlayer();

  // Logic to check if buttons should be active
  const hasPrev = queue && currentIndex > 0;
  const hasNext = queue && currentIndex < queue.length - 1;

  // Animation Values
  const progressWidth = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // 1. Progress Bar Logic
  useEffect(() => {
    if (duration > 0) {
      const percentage = (position / duration) * 100;
      progressWidth.value = withTiming(percentage, { duration: 1000 });
    }
  }, [position, duration]);

  // 2. Pulse Animation (Heartbeat when playing)
  useEffect(() => {
    if (isPlaying) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 800 }), // Expand slightly
          withTiming(1, { duration: 800 }), // Shrink back
        ),
        -1, // Infinite
        true,
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [isPlaying]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // If no track, hide the player
  if (!currentTrack) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutDown}
      layout={LinearTransition.springify()}
      style={[styles.container, animatedContainerStyle]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push("/player")}
      >
        {/* GLASS EFFECT CONTAINER */}
        <BlurView intensity={40} tint="dark" style={styles.glassContent}>
          {/* CLOSE BUTTON (Visible only when PAUSED) */}
          {!isPlaying && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                closePlayer();
              }}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                backgroundColor: "#fff",
                borderRadius: 12, // Fully round
                width: 22, // Slightly smaller
                height: 22, // Slightly smaller
                justifyContent: "center",
                alignItems: "center",
                zIndex: 999,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: 5,
              }}
            >
              <Ionicons name="close" size={16} color="#000" />
            </TouchableOpacity>
          )}
          {/* A. ALBUM ART */}
          <View style={styles.artContainer}>
            <Image
              source={{
                uri: currentTrack.artwork || "https://via.placeholder.com/100",
              }}
              style={styles.artwork}
            />
          </View>

          {/* B. INFO TEXT */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack.artist || "Now Playing"}
            </Text>
          </View>

          {/* C. CONTROLS (Next/Prev Restored) */}
          <View style={styles.controls}>
            {/* PREV BUTTON */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if (hasPrev) playPrev();
              }}
              disabled={!hasPrev}
            >
              <Ionicons
                name="play-skip-back"
                size={22}
                color={hasPrev ? "#fff" : "rgba(255,255,255,0.2)"}
              />
            </TouchableOpacity>

            {/* PLAY/PAUSE */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              style={styles.playBtn}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={22}
                color="#000"
                style={{ marginLeft: isPlaying ? 0 : 2 }}
              />
            </TouchableOpacity>

            {/* NEXT BUTTON */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if (hasNext) playNext();
              }}
              disabled={!hasNext}
            >
              <Ionicons
                name="play-skip-forward"
                size={22}
                color={hasNext ? "#fff" : "rgba(255,255,255,0.2)"}
              />
            </TouchableOpacity>
          </View>

          {/* D. PROGRESS BAR */}
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[styles.progressBarFill, animatedProgressStyle]}
            />
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 110, // Just above the Tab Bar
    left: 15,
    right: 15,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 100, // Always on top
  },
  glassContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(30,30,30,0.6)", // Slight tint
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  artContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  artwork: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#333",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  artist: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginRight: 35,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.premium.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarBg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3, // Thicker line for visibility
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.premium.gold,
  },
});
