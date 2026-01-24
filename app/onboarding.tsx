import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient"; // <--- ADD THIS
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "Master Your Mind",
    subtitle:
      "Unlock your full potential with daily motivation curated just for you.",
    icon: "bulb",
    bg: ["#000000", "#1a1a1a"],
  },
  {
    id: "2",
    title: "Sleep Like a King",
    subtitle: "Drift off with exclusive rain sounds and ambient frequencies.",
    icon: "moon",
    bg: ["#0f0c29", "#302b63"],
  },
  {
    id: "3",
    title: "Crush Your Goals",
    subtitle: "High-energy beats to push you past your limits in the gym.",
    icon: "barbell",
    bg: ["#200122", "#6f0000"],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle Swipe
  const onViewableItemsChanged = React.useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  // Finish Onboarding
  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem("hasLaunched", "true");
      router.replace("/auth"); // Go to Login
    } catch (error) {
      console.log("Error @handleFinish: ", error);
      router.replace("/auth");
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient that changes based on slide */}

      <FlatList
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Animated Icon Circle */}
            <Animated.View
              entering={FadeInUp.duration(1000).springify()}
              style={styles.iconCircle}
            >
              <Ionicons
                name={item.icon}
                size={80}
                color={Colors.premium.gold}
              />
            </Animated.View>

            {/* Text Content */}
            <Animated.View
              entering={FadeInDown.duration(1000).springify()}
              style={styles.textContainer}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </Animated.View>
          </View>
        )}
      />

      {/* Footer: Paginator & Button */}
      <View style={styles.footer}>
        {/* Paginator Dots */}
        <View style={styles.paginator}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.premium.gold, "#B8860B"]}
            style={styles.gradientBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.btnText}>GET STARTED</Text>
            <Ionicons
              name="arrow-forward"
              size={15}
              color="#000"
              style={{ marginLeft: 10 }}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent", // <--- CHANGED
  },
  slide: {
    width: width,
    height: height,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: Colors.premium.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  textContainer: { alignItems: "center", paddingHorizontal: 20 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 15,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#A1A1AA",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  paginator: {
    flexDirection: "row",
    height: 64,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.premium.gold,
  },
  dotInactive: {
    width: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  button: {
    width: "100%",
    shadowColor: Colors.premium.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  gradientBtn: {
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
  },
  btnText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "700",
  },
});
