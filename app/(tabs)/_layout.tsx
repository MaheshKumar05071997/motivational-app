import { Tabs, usePathname } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";

// Don't forget to import:
import LiveBackground from "@/components/LiveBackground";

import { HapticTab } from "@/components/haptic-tab";
import MiniPlayer from "@/components/MiniPlayer";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";

import { usePlayer } from "@/app/PlayerContext"; // Ensure this path is correct

export default function TabLayout() {
  const { showCelebration } = usePlayer();
  const pathname = usePathname();
  // Check if we are on the profile tab
  const isProfile = pathname === "/profile";
  const colorScheme = useColorScheme();

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* 1. The Engine: Live Background sits here forever */}
      <LiveBackground />

      {/* 2. Your Existing Tabs Logic */}
      <Tabs
        sceneContainerStyle={{ backgroundColor: "transparent" }}
        screenOptions={{
          headerShown: false,
          tabBarBackground: () => (
            // Make tab background glass-like so live wallpaper shows through
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }} />
          ),
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          tabBarButton: HapticTab,
          tabBarStyle: Platform.select({
            ios: {
              position: "absolute",
              backgroundColor: "rgba(0,0,0,0.3)", // More transparent
              borderTopColor: "rgba(255,255,255,0.1)",
              elevation: 0,
            },
            default: {
              backgroundColor: "rgba(0,0,0,0.3)",
              borderTopColor: "rgba(255,255,255,0.1)",
              elevation: 0,
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
            },
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: "Favorites",
            tabBarIcon: ({ color }) => (
              <Ionicons size={28} name="heart" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color }) => (
              <Ionicons name="compass" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person" size={28} color={color} />
            ),
          }}
        />

        {/* HIDDEN TABS */}
        <Tabs.Screen
          name="playlist"
          options={{ href: null, title: "Playlist" }}
        />
        <Tabs.Screen
          name="downloads"
          options={{ href: null, title: "Offline" }}
        />
      </Tabs>

      {/* 3. Your MiniPlayer Logic */}
      {!isProfile && <MiniPlayer />}
    </View>
  );
}
