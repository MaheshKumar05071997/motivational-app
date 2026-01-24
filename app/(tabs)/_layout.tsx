import { Tabs, usePathname } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import MiniPlayer from "@/components/MiniPlayer";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";

import { usePlayer } from "@/app/PlayerContext"; // Ensure this path is correct
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

export default function TabLayout() {
  const { showCelebration } = usePlayer();
  const pathname = usePathname();
  // Check if we are on the profile tab
  const isProfile = pathname === "/profile";
  const colorScheme = useColorScheme();

  return (
    <>
      <Tabs
        sceneContainerStyle={{ backgroundColor: "transparent" }}
        screenOptions={{
          headerShown: false,
          tabBarBackground: () => (
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)" }} />
          ),
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          tabBarButton: HapticTab,
          tabBarStyle: Platform.select({
            ios: {
              position: "absolute",
              backgroundColor: "rgba(0,0,0,0.8)",
              borderTopColor: "#333",
            },
            default: { backgroundColor: "#000", borderTopColor: "#333" },
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

        {/* HIDDEN TAB: Playlist */}
        <Tabs.Screen
          name="playlist"
          options={{
            href: null,
            title: "Playlist",
          }}
        />
        {/* HIDDEN TAB: Downloads */}
        <Tabs.Screen
          name="downloads"
          options={{
            href: null,
            title: "Offline",
          }}
        />
      </Tabs>

      {/* --- THE FLOATING DECK --- */}
      {/* Hide MiniPlayer on Profile Screen */}
      {/* --- GLOBAL VICTORY POPUP --- */}
      {showCelebration && (
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOutUp}
          style={{
            position: "absolute",
            top: 60, // Visible on all screens
            alignSelf: "center",
            backgroundColor: "#FFD700", // Gold
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 30,
            flexDirection: "row",
            alignItems: "center",
            zIndex: 9999, // On top of everything
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <Ionicons
            name="trophy"
            size={24}
            color="#000"
            style={{ marginRight: 10 }}
          />
          <View>
            <Text style={{ color: "#000", fontWeight: "800", fontSize: 14 }}>
              DIVINE VIBES
            </Text>
            <Text style={{ color: "#000", fontWeight: "600", fontSize: 12 }}>
              +10 XP Earned
            </Text>
          </View>
        </Animated.View>
      )}
      {!isProfile && <MiniPlayer />}
    </>
  );
}
