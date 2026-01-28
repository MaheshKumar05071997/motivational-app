import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { usePlayer } from "../app/PlayerContext";

export default function CustomAlert() {
  const { alertConfig, hideAlert } = usePlayer();

  if (!alertConfig.visible) return null;

  return (
    <Modal transparent visible={alertConfig.visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOutDown}
          style={styles.container}
        >
          {/* Background Layer (Optimized for Android) */}
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(20,20,20,0.95)" },
              ]}
            />
          )}

          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconCircle}>
              <Ionicons
                name={alertConfig.icon || "notifications"}
                size={32}
                color={Colors.premium.gold}
              />
            </View>

            {/* Text */}
            <Text style={styles.title}>{alertConfig.title}</Text>
            <Text style={styles.message}>{alertConfig.message}</Text>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              {/* Secondary Button (Cancel/No) */}
              {alertConfig.secondaryText && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={() => {
                    if (alertConfig.onSecondaryPress)
                      alertConfig.onSecondaryPress();
                    hideAlert();
                  }}
                >
                  <Text style={styles.btnTextSecondary}>
                    {alertConfig.secondaryText}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Primary Button (OK/Yes) */}
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => {
                  if (alertConfig.onPrimaryPress) alertConfig.onPrimaryPress();
                  hideAlert();
                }}
              >
                <Text style={styles.btnTextPrimary}>
                  {alertConfig.primaryText || "Okay"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  content: {
    padding: 25,
    alignItems: "center",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.premium.gold,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#CCC",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 15,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: Colors.premium.gold,
  },
  btnSecondary: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  btnTextPrimary: {
    color: "#000",
    fontWeight: "700",
    fontSize: 14,
  },
  btnTextSecondary: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
