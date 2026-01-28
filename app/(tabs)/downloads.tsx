import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, Layout, ZoomIn } from "react-native-reanimated";
import { usePlayer } from "../PlayerContext";

// --- REUSED PREMIUM CARD COMPONENT (Adapted for Offline) ---
const DownloadCard = ({ item, index, onPress }: any) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)
        .springify()
        .damping(12)}
      layout={Layout.springify()}
      style={{ marginBottom: 12 }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.cardContainer}
      >
        <BlurView intensity={30} tint="dark" style={styles.cardGlass}>
          {/* 1. Album Art or Placeholder */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri:
                  (FileSystem.documentDirectory || "") +
                  item.replace(".mp3", ".jpg"),
              }}
              style={{ width: "100%", height: "100%", borderRadius: 10 }}
              // Fallback for old downloads without images
              defaultSource={require("@/assets/images/react-logo.png")}
            />
          </View>

          {/* 2. Text Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.replace(/_/g, " ").replace(".mp3", "")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.cardMeta}>Offline • Ready to Play</Text>
            </View>
          </View>

          {/* 3. Play Button */}
          <View style={styles.playBtn}>
            <Ionicons name="play" size={16} color="#FFF" />
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DownloadsScreen() {
  const router = useRouter();
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrackList } = usePlayer();

  // RELOAD EVERY TIME TAB IS OPENED
  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, []),
  );

  async function loadFiles() {
    try {
      const allFiles = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory || "",
      );
      setFiles(allFiles.filter((file) => file.endsWith(".mp3")));
    } catch (error) {
      console.log("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  }

  const playLocalFile = (filename: string, index: number) => {
    const trackList = files.map((f) => ({
      id: f,
      url: (FileSystem.documentDirectory || "") + f,
      title: f.replace(/_/g, " ").replace(".mp3", ""),
      artist: "Offline Download",
      artwork: (FileSystem.documentDirectory || "") + f.replace(".mp3", ".jpg"),
      is_locked: false,
    }));
    playTrackList(trackList, index);
    router.push("/player");
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleSmall}>Offline Library</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.premium.gold}
          style={{ marginTop: 100 }}
        />
      ) : (
        <Animated.FlatList
          data={files}
          keyExtractor={(item) => item}
          itemLayoutAnimation={Layout.springify()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={{ marginBottom: 25, marginTop: 10 }}
            >
              <Text style={styles.pageTitle}>Downloads ☁️</Text>
              <Text style={styles.pageSub}>
                Your personal offline sanctuary.
              </Text>
            </Animated.View>
          }
          ListEmptyComponent={
            <Animated.View
              entering={ZoomIn.delay(300)}
              style={styles.emptyContainer}
            >
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={40}
                  color="rgba(255,255,255,0.3)"
                />
              </View>
              <Text style={styles.emptyText}>No downloads yet.</Text>
              <Text style={styles.emptySubText}>
                Save tracks to listen without internet.
              </Text>
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <DownloadCard
              item={item}
              index={index}
              onPress={() => playLocalFile(item, index)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" }, // Transparent for Live BG
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  backBtn: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  headerTitleSmall: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  pageTitle: {
    color: "#FFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  pageSub: { color: "#888", fontSize: 15, marginTop: 5 },

  // Card Styles
  cardContainer: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardGlass: { flexDirection: "row", alignItems: "center", padding: 14 },
  imageContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: "rgba(255,215,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  infoContainer: { flex: 1, justifyContent: "center", gap: 3 },
  cardTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardMeta: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "500" },
  playBtn: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty State
  emptyContainer: { alignItems: "center", marginTop: 80, padding: 20 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  emptyText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  emptySubText: {
    color: "#888",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
});
