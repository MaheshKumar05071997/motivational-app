import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Linking from "expo-linking"; // <--- Add this
import * as Notifications from "expo-notifications";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated"; // <--- ANIMATIONS
import LiveBackground from "../components/LiveBackground";
import { supabase } from "../supabaseConfig";

// Contexts & Components
import CustomAlert from "../components/CustomAlert";
import MiniPlayer from "../components/MiniPlayer";
import { PlayerProvider, usePlayer } from "./PlayerContext"; // <--- ADD usePlayer

// FIX: Force the notification to show even when the app is open
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
      if (session) {
        // FIX: Only register when we have a logged-in user!
        registerNotifications();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ... inside RootLayout function ...

  // --- FIX: LISTEN FOR GOOGLE LOGIN REDIRECT ---
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      let { url } = event;
      console.log("🔗 Incoming Deep Link:", url);

      // 1. Fix the URL format if needed
      if (url.includes("#") && !url.includes("?")) {
        url = url.replace("#", "?");
      }

      // 2. Parse the URL
      const { queryParams } = Linking.parse(url);
      const access_token = queryParams?.access_token as string;
      const refresh_token = queryParams?.refresh_token as string;

      // 3. Login
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          console.error("❌ Session Error:", error);
        } else {
          console.log("✅ Google Login Successful!");
          // Force navigation to Tabs if not already there
          router.replace("/(tabs)");
        }
      }
    };

    // A. Check if app was opened by the link (Cold Start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // B. Listen for new links while app is running (Warm Switch)
    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  // ... rest of your code ...

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
    // 0. FIX: STOP IF EXPO GO (It crashes SDK 53)
    if (Constants.executionEnvironment === "storeClient") {
      console.log("🚫 Push Notifications skipped in Expo Go");
      return;
    }

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          Alert.alert("Error", "Permission not granted for notifications");
          return;
        }

        // 1. GET PROJECT ID (Fix for "No projectId found" error)
        // TODO: Copy your Project ID from https://expo.dev/accounts/your_username/projects/your_slug
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId ??
          "219b7322-3644-46d0-b920-d54f17be6834";

        if (!projectId) {
          Alert.alert(
            "Error",
            "Project ID is missing. Please hardcode it in _layout.tsx for testing.",
          );
          return;
        }

        if (!projectId) {
          console.log("Project ID missing. Ensure eas.json is configured.");
          // We continue anyway, hoping Expo infers it, but logging the warning.
        }

        // 2. GET TOKEN
        console.log("Attempting to get token with Project ID:", projectId);
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        const token = tokenData.data;
        console.log("New Token Generated:", token);

        // 3. SAVE TO SUPABASE
        const {
          data: { user },
        } = await supabase.auth.getUser();
        console.log("Current User for Token:", user?.id);

        await supabase.auth.getUser();

        if (user) {
          const { error } = await supabase
            .from("profiles")
            .update({ push_token: token })
            .eq("id", user.id);

          if (error) {
            console.error("Supabase Save Error:", error);
            Alert.alert("Token Save Failed", error.message);
          }

          if (error) {
            Alert.alert("DB Error", error.message);
            console.log("DB Error:", error);
          } else {
            console.log("✅ Token saved to DB!", token);
          }
        } else {
          console.log("User not logged in, cannot save token.");
        }
      } else {
        console.log("Must use physical device for Push Notifications");
      }
    } catch (error: any) {
      Alert.alert("Notification Error", error.message);
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
          {/* THE NEW FERRARI ALERT SYSTEM 🏎️ */}
          <CustomAlert />
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
