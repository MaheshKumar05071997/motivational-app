import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const Orb = ({ color, size, startX, startY, duration }: any) => {
  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(startY);
  const scale = useSharedValue(1);

  useEffect(() => {
    // 1. Move Horizontally
    translateX.value = withRepeat(
      withSequence(
        withTiming(startX + 100, {
          duration: duration,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(startX - 100, {
          duration: duration * 1.2,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    // 2. Move Vertically
    translateY.value = withRepeat(
      withSequence(
        withTiming(startY - 100, {
          duration: duration * 1.1,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(startY + 100, {
          duration: duration * 0.9,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    // 3. Breathe (Scale)
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: duration / 2 }),
        withTiming(1, { duration: duration / 2 }),
      ),
      -1,
      true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        { backgroundColor: color, width: size, height: size },
        style,
      ]}
    />
  );
};

export default function LiveBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#050505" }]} />
      {/* Orb 1: Gold (Top Left) */}
      <Orb
        color="rgba(255, 215, 0, 0.15)"
        size={300}
        startX={-50}
        startY={-50}
        duration={6000}
      />
      {/* Orb 2: Purple (Bottom Right) */}
      <Orb
        color="rgba(168, 85, 247, 0.15)"
        size={400}
        startX={width - 200}
        startY={height - 200}
        duration={8000}
      />
      {/* Orb 3: Cyan/Blue (Center) */}
      <Orb
        color="rgba(74, 222, 128, 0.1)"
        size={250}
        startX={width / 2 - 125}
        startY={height / 2}
        duration={7000}
      />

      {/* Glass Effect Overlay to smooth everything out */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(30px)" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: 999,
    blurRadius: 100, // Makes them glowing and soft
  },
});
