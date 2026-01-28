import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

// Simple Static Orb (Just a styled View, no animation logic)
const StaticOrb = ({ color, size, x, y }: any) => {
  return (
    <View
      style={[
        styles.orb,
        {
          backgroundColor: color,
          width: size,
          height: size,
          left: x,
          top: y,
        },
      ]}
    />
  );
};

export default function LiveBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* 1. Deep Black Background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#050505" }]} />

      {/* 2. Static Orbs (Fixed Positions) */}

      {/* Gold Orb (Top Left) */}
      <StaticOrb color="rgba(255, 215, 0, 0.15)" size={300} x={-50} y={-50} />

      {/* Purple Orb (Bottom Right) */}
      <StaticOrb
        color="rgba(168, 85, 247, 0.15)"
        size={400}
        x={width - 200}
        y={height - 200}
      />

      {/* Cyan/Green Orb (Center) */}
      <StaticOrb
        color="rgba(74, 222, 128, 0.1)"
        size={250}
        x={width / 2 - 125}
        y={height / 2 - 100}
      />

      {/* 3. Glass Overlay (Smooths the blur) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.3)" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: 999,
    blurRadius: 100, // Keeps the glowing gas effect
  },
});
