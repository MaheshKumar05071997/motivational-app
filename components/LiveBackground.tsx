import { ResizeMode, Video } from "expo-av";
import { usePathname } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

// 🎛️ MASTER CONTROL
const DIM_OPACITY = 0.5;

// 🎛️ VIDEO MAP: Add your pages and videos here
// 1. "/" is Home
// 2. "/auth" is Login/Signup
// 3. "/(tabs)/explore" is Explore Page
const VIDEO_CONFIG: Record<string, any> = {
  "/": require("@/assets/images/space_bg.mp4"),
  "/auth": require("@/assets/images/white_bg.mp4"), // You can change this file
  "/(tabs)/explore": require("@/assets/images/space_bg.mp4"), // You can change this file
  default: require("@/assets/images/white_bg.mp4"), // Fallback video
};

// 🎛️ CONFIG: Add the paths where you want the background to show
// "/" = Home, "/onboarding" = Intro, "/auth" = Login
// Config: "/auth" = Login/Signup, "/(tabs)" = Home & Dashboard
export default function LiveBackground() {
  const pathname = usePathname();
  const shouldShow = !pathname.includes("anc");

  if (!shouldShow) return null;

  // 🔎 Find the correct video for this page
  // We check if the current path starts with the config key
  const activeKey =
    Object.keys(VIDEO_CONFIG).find((key) => pathname.startsWith(key)) ||
    "default";
  const videoSource = VIDEO_CONFIG[activeKey];

  return (
    <View style={StyleSheet.absoluteFill}>
      <Video
        source={videoSource} // <--- Now uses the dynamic source
        style={[StyleSheet.absoluteFill, styles.video]}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay
        isMuted={true}
      />
      {/* The Dimmer Overlay controlled by the switch above */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "black", opacity: DIM_OPACITY },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    //zIndex: -1, // Ensures it stays behind everything
    backgroundColor: "black", // Prevents white flashes before video loads
  },
});
