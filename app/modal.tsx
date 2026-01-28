import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ModalScreen() {
  const { videoUrl } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />

      {/* Close Button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
        <Ionicons name="close" size={30} color="#FFF" />
      </TouchableOpacity>

      {videoUrl ? (
        <Video
          style={styles.video}
          source={{ uri: videoUrl as string }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay
        />
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color="#FF453A" />
          <Text style={styles.errorText}>No Video URL Provided</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  errorContainer: {
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
