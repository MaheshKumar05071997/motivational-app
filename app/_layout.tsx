import { useColorScheme } from "@/hooks/use-color-scheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import LiveBackground from "../components/LiveBackground"; // <--- ADD THIS
import { supabase } from "../supabaseConfig";

// Contexts & Components
import MiniPlayer from "../components/MiniPlayer";
import { PlayerProvider } from "./PlayerContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);

  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname(); // <--- Added this to track current screen
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepareApp() {
      try {
        // 1. Check Onboarding Status
        const hasLaunched = await AsyncStorage.getItem("hasLaunched");
        setIsFirstLaunch(hasLaunched === null); // If null, it's the first time

        // 2. Check Auth Session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepareApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Trigger Notification Setup
    registerNotifications();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    // 1. If Logged In -> Force Home
    if (session) {
      if (inAuthGroup || inOnboarding) {
        router.replace("/(tabs)");
      }
      return;
    }

    // 2. Not Logged In logic
    if (isFirstLaunch && !inOnboarding) {
      router.replace("/onboarding");
    } else if (!isFirstLaunch && !session && !inAuthGroup) {
      router.replace("/auth");
    }
  }, [isReady, session, isFirstLaunch]);

  async function registerNotifications() {
    // WRAP IN TRY-CATCH TO PREVENT CRASH IN EXPO GO (SDK 53)
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        return;
      }

      // Schedule Daily "Aaj Ka Vichar" at 8:00 AM
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "☀️ Aaj ka Vichar",
          body: "Apni soch badlo, jeevan badlo. Tap to read daily quote.",
          sound: true,
        },
        trigger: {
          hour: 8,
          minute: 0,
          repeats: true,
          channelId: "default",
        } as any,
      });
    } catch (error) {
      console.log("Notification Error (Safe to ignore in Expo Go):", error);
    }
  }

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  // 1. Create a Transparent Theme to stop the "Black Wall" glitch
  const TransparentTheme: Theme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: "transparent", // <--- THIS IS THE KEY FIX
    },
  };

  return (
    <ThemeProvider value={TransparentTheme}>
      <PlayerProvider>
        <View style={{ flex: 1, backgroundColor: "transparent" }}>
          {/* 1. The Global Live Wallpaper */}
          <LiveBackground />

          {/* 2. The App Screens (Made Transparent) */}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" }, // <--- CRITICAL
              animation: "fade", // smoother transitions over the wallpaper
            }}
          >
            <Stack.Screen
              name="onboarding"
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" />
          </Stack>

          {/* Hide on Player, Profile, Paywall */}
          {session &&
            pathname !== "/player" &&
            pathname !== "/profile" &&
            pathname !== "/paywall" && <MiniPlayer />}
        </View>
      </PlayerProvider>
    </ThemeProvider>
  );
}
