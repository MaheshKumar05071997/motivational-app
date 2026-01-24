import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy"; // <--- Using Legacy to avoid error
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePlayer } from "../PlayerContext";

export default function DownloadsScreen() {
  const router = useRouter();
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrackList } = usePlayer();

  useEffect(() => {
    loadFiles();
  }, []);

  // 📂 SCAN THE DOCUMENT DIRECTORY
  async function loadFiles() {
    try {
      // 1. Read the folder
      const allFiles = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory || "",
      );

      // 2. Filter only .mp3 files
      const mp3Files = allFiles.filter((file) => file.endsWith(".mp3"));
      setFiles(mp3Files);
    } catch (error) {
      console.log("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  }

  // 🎵 PLAY FROM STORAGE
  const playLocalFile = (filename: string, index: number) => {
    // 1. Create a "Track" list from your local files
    const trackList = files.map((f) => ({
      id: f, // Use filename as ID
      url: (FileSystem.documentDirectory || "") + f, // The local path
      title: f.replace(/_/g, " ").replace(".mp3", ""), // Clean up name
      artist: "Offline Download",
      artwork: null, // No artwork for offline (or add a placeholder)
      is_locked: false, // Local files are always unlocked
    }));

    // 2. Play it
    playTrackList(trackList, index);
    router.push("/player");
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Offline Library 📂</Text>
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator
          color={Colors.premium.gold}
          size="large"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={50} color="#555" />
              <Text style={styles.emptyText}>No downloads yet.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => playLocalFile(item, index)}
              style={styles.row}
            >
              <View style={styles.iconBox}>
                <Ionicons name="musical-note" size={24} color="#000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName}>
                  {item.replace(/_/g, " ").replace(".mp3", "")}
                </Text>
                <Text style={styles.subText}>Ready to play</Text>
              </View>
              <Ionicons
                name="play-circle"
                size={30}
                color={Colors.premium.gold}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  backBtn: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    marginRight: 15,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#fff" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.premium.gold,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  fileName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  subText: { color: "#888", fontSize: 12 },

  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#666", marginTop: 10 },
});
