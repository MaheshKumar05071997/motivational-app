import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated"; // <--- ANIMATIONS
import LiveBackground from "../components/LiveBackground";
import { supabase } from "../supabaseConfig";

// Contexts & Components
import MiniPlayer from "../components/MiniPlayer";
import { PlayerProvider, usePlayer } from "./PlayerContext"; // <--- ADD usePlayer

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
    try {
      // 1. Android Channel Setup
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      // 2. Check Device & Permissions
      if (Device.isDevice) {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          console.log("Permission not granted!");
          return;
        }

        // 3. CAPTURE TOKEN & SAVE TO SUPABASE
        const projectId = undefined; // Automatically inferred by Expo
        const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
          .data;
        console.log("🔥 Push Token:", token);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from("profiles")
            .update({ push_token: token })
            .eq("id", user.id);

          if (error) console.log("DB Token Error:", error.message);
        }
      } else {
        console.log("Must use physical device for Push Notifications");
      }

      // 4. (Optional) Keep your local daily schedule if you want
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
      console.log("Notification Error:", error);
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

          {/* GLOBAL VICTORY POPUP (Floats over EVERYTHING) */}
          <GlobalCelebration />
        </View>
      </PlayerProvider>
    </ThemeProvider>
  );

  // --- HELPER COMPONENT FOR REWARD POPUP ---
  function GlobalCelebration() {
    const { showCelebration } = usePlayer();
    if (!showCelebration) return null;

    return (
      <Animated.View
        entering={FadeInDown.springify()}
        exiting={FadeOutUp}
        style={{
          position: "absolute",
          top: 60, // Safe area top
          alignSelf: "center",
          backgroundColor: "#FFD700", // Gold
          paddingHorizontal: 25,
          paddingVertical: 15,
          borderRadius: 50,
          flexDirection: "row",
          alignItems: "center",
          zIndex: 99999, // Highest Layer
          elevation: 10,
          shadowColor: "#FFD700",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
        }}
      >
        <Ionicons
          name="trophy"
          size={28}
          color="#000"
          style={{ marginRight: 10 }}
        />
        <View>
          <Text style={{ color: "#000", fontWeight: "900", fontSize: 16 }}>
            DIVINE VIBES
          </Text>
          <Text style={{ color: "#333", fontWeight: "700", fontSize: 12 }}>
            +10 XP EARNED
          </Text>
        </View>
      </Animated.View>
    );
  }
}
