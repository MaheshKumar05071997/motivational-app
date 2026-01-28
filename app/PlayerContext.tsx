import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Vibration } from "react-native";
import TrackPlayer, { Capability } from "react-native-track-player";
import { supabase } from "../supabaseConfig";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const router = useRouter(); // <--- NEW
  const currentTrackRef = useRef(null);
  // FIX: Track specific IDs to prevent infinite loops when navigating
  const lastFinishedIdRef = useRef(null);
  // FIX: Use a Set to track ALL songs rewarded in this session (Prevents infinite loop)
  const rewardedSongIds = useRef(new Set());
  // REMOVED sound state (TrackPlayer handles it)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  // NEW: Get Progress directly from the Engine
  const { position, duration } = useProgress();

  const [isPremium, setIsPremium] = useState(false);
  // ✅ ADD THESE TWO LINES:
  const isPremiumRef = useRef(isPremium); // <--- ADD THIS (Keeps track of premium status reliably)
  const [isLifetime, setIsLifetime] = useState(false);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null);
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set()); // Stores IDs of liked songs
  // Global Celebration State
  const [showCelebration, setShowCelebration] = useState(false);
  // --- GLOBAL PREMIUM ALERT STATE ---
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "lock-closed", // default icon
    primaryText: "OK",
    onPrimaryPress: null,
    secondaryText: null,
    onSecondaryPress: null,
  });

  const showAlert = (config) => {
    setAlertConfig({ ...config, visible: true });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // --- SLEEP TIMER STATE ---
  const [sleepTimer, setSleepTimer] = useState(null); // Stores timeout ID
  const [sleepMinutes, setSleepMinutes] = useState(0); // Stores display time

  // Check Premium Status & Listen for Login Changes
  useEffect(() => {
    // A. Setup TrackPlayer (The New Engine)
    async function setupPlayer() {
      try {
        // 1. Initialize
        await TrackPlayer.setupPlayer();

        // 2. Define Capabilities (What buttons show on Lock Screen)
        await TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
        });
        console.log("✅ TrackPlayer Initialized");
      } catch (e) {
        console.log("Player already setup or error:", e);
      }
    }
    setupPlayer();

    checkPremium();
    fetchFavorites();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      // ✅ FIX LOOP: Only check premium if we are NOT signing out
      if (event !== "SIGNED_OUT") {
        checkPremium();
      }

      // FIX 2: STOP MUSIC ON LOGOUT
      if (event === "SIGNED_OUT") {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        setSound(null);
        soundRef.current = null;
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkPremium() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 1. Fetch 'is_premium' AND 'subscription_expiry'
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, subscription_expiry")
        .eq("id", user.id)
        .single();

      if (data) {
        // 2. Check if Lifetime Premium OR Temporary Access is valid
        const hasLifetime = data.is_premium;
        const hasValidSubscription =
          data.subscription_expiry &&
          new Date(data.subscription_expiry) > new Date();

        setIsPremium(hasLifetime || hasValidSubscription);

        // Update details
        isPremiumRef.current = hasLifetime || hasValidSubscription; // <--- ADD THIS
        setIsLifetime(hasLifetime);
        setSubscriptionExpiry(data.subscription_expiry);
      } else {
        // 🚨 ZOMBIE RECOVERY: User exists, but Profile is missing
        console.log(
          "⚠️ Profile missing for logged-in user! Attempting auto-fix...",
        );

        const { error: insertError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            email: user.email,
            full_name: "Soul",
          },
        ]);

        if (!insertError) {
          console.log("✅ Profile created! Retrying check...");
          checkPremium(); // Retry
        } else {
          console.log("❌ Critical: Auto-fix failed.");
        }
      }
    } else {
      // No user logged in. Just reset state.
      setIsPremium(false);
    }
  }

  // --- PUSH NOTIFICATION HELPER ---
  async function sendPushNotification(title, body) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get Token
      const { data } = await supabase
        .from("profiles")
        .select("push_token")
        .eq("id", user.id)
        .single();

      if (data?.push_token) {
        // 2. Send via Expo API
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: data.push_token,
            title: title,
            body: body,
            sound: "default",
            data: { extraData: "Some data" },
          }),
        });
        console.log("Push Sent:", title);
      }
    } catch (e) {
      console.log("Push Error:", e);
    }
  }

  // --- FAVORITES LOGIC (Database Connected) ---
  async function fetchFavorites() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("favorites")
      .select("song_id")
      .eq("user_id", user.id);

    if (data) {
      // Convert array of objects to a Set of IDs for fast lookup
      const ids = new Set(data.map((item) => item.song_id));
      setLikedTrackIds(ids);
    }
  }

  async function toggleFavorite(track) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth"); // Send to login if not logged in
      return;
    }

    const isLiked = likedTrackIds.has(track.id);

    // 1. Optimistic UI Update (Turant Color Change)
    const newSet = new Set(likedTrackIds);
    if (isLiked) {
      newSet.delete(track.id);
    } else {
      newSet.add(track.id);
    }
    setLikedTrackIds(newSet);

    // 2. Database Operation (Quietly in background)
    if (isLiked) {
      // Remove
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("song_id", track.id);
    } else {
      // Add
      const { error } = await supabase
        .from("favorites")
        .insert([{ user_id: user.id, song_id: track.id }]);

      if (error) console.log("Fav Error:", error.message);
    }
  }

  // --- AUDIO LOGIC ---
  async function loadTrack(track, shouldPlay = true) {
    try {
      // 1. Reset Player
      await TrackPlayer.reset();

      // 2. Add Track with Metadata (Crucial for Lock Screen)
      await TrackPlayer.add({
        id: track.id,
        url: track.url,
        title: track.title,
        artist: track.artist || "Soul App",
        artwork: track.artwork, // Displays on Lock Screen!
      });

      // 3. Reset Logic for Rewards
      lastFinishedIdRef.current = null;
      rewardedSongIds.current.delete(track.id);

      // 4. Play
      if (shouldPlay) await TrackPlayer.play();

      // 5. Update Local State
      currentTrackRef.current = track;
      setCurrentTrack(track);
      // isPlaying will be updated automatically by the Event Listener below
    } catch (error) {
      console.log("Error loading track:", error);
    }
  }

  // --- 1. LISTEN FOR EVENTS (Play/Pause/Finish) ---
  useTrackPlayerEvents(
    [Event.PlaybackState, Event.PlaybackQueueEnded],
    async (event) => {
      // A. Update Play/Pause/Buffering State
      if (event.type === Event.PlaybackState) {
        setIsPlaying(event.state === State.Playing);
        setIsBuffering(
          event.state === State.Buffering || event.state === State.Connecting,
        );
      }

      // B. Song Finished -> Play Next
      if (event.type === Event.PlaybackQueueEnded) {
        if (
          currentTrackRef.current &&
          lastFinishedIdRef.current !== currentTrackRef.current.id
        ) {
          lastFinishedIdRef.current = currentTrackRef.current.id;

          // Update Stats
          updateStats(currentTrackRef.current.duration_sec || duration);
          incrementGlobalPlays(currentTrackRef.current.id);

          // Mission Logic
          if (currentTrackRef.current.isMission) {
            const today = new Date().toISOString().split("T")[0];
            await AsyncStorage.setItem("mission_completed_date", today);
            // ... (Your existing DB update logic for mission can go here if you want to copy it back)
          }
        }
        playNext();
      }
    },
  );

  // --- 2. REWARD LOGIC (Watches Progress) ---
  useEffect(() => {
    if (!currentTrack || duration <= 0) return;

    // Convert duration to seconds for check (TrackPlayer uses seconds in some versions, but useProgress returns seconds)
    // Actually useProgress returns SECONDS.

    // Logic: If played > 80%
    if (
      position > duration * 0.8 &&
      !rewardedSongIds.current.has(currentTrack.id)
    ) {
      rewardedSongIds.current.add(currentTrack.id);
      triggerCelebration();
    }
  }, [position, duration]);

  async function playTrackList(tracks, index) {
    setQueue(tracks);
    setCurrentIndex(index);
    await loadTrack(tracks[index]);
  }

  // NEW: Close Player Function ❌
  const closePlayer = async () => {
    await TrackPlayer.reset();
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  async function togglePlayPause() {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      // Logic to Replay if finished
      if (position >= duration && duration > 0) {
        await TrackPlayer.seekTo(0);
      }
      await TrackPlayer.play();
    }
  }

  async function playNext() {
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextTrack = queue[nextIndex];

      // SECURITY CHECK: If locked and user not premium -> POP UP PAYWALL
      if (nextTrack.is_locked && !isPremium) {
        router.push("/paywall"); // <--- FIX 1: Open Paywall
        return;
      }

      setCurrentIndex(nextIndex);
      await loadTrack(nextTrack);
    }
  }

  // --- SLEEP TIMER LOGIC ---
  function startSleepTimer(minutes) {
    // 1. Clear existing timer if any
    if (sleepTimer) clearTimeout(sleepTimer);
    setSleepMinutes(minutes);

    if (minutes === 0) {
      // "Off" mode
      return;
    }

    console.log(`Sleep timer set for ${minutes} minutes`);

    // 2. Set new timer
    const timerId = setTimeout(
      async () => {
        if (soundRef.current) {
          // Optional: Fade out logic could go here
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        }
        setSleepMinutes(0);
        setSleepTimer(null);
      },
      minutes * 60 * 1000,
    ); // Convert to ms

    setSleepTimer(timerId);
  }

  async function playPrev() {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevTrack = queue[prevIndex];

      // SECURITY CHECK: If previous song is locked and user is NOT premium -> POP UP PAYWALL
      if (prevTrack.is_locked && !isPremium) {
        router.push("/paywall");
        return;
      }

      setCurrentIndex(prevIndex);
      await loadTrack(prevTrack);
    }
  }

  async function seekTo(millis) {
    // TrackPlayer uses Seconds, not Milliseconds
    await TrackPlayer.seekTo(millis / 1000);
  }

  // --- GAMIFICATION STATS ---
  async function updateStats(seconds) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Quick update logic
    const today = new Date().toISOString().split("T")[0];
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      let newStreak = profile.streak_count || 0;

      // Simple streak logic: if last listened date is NOT today, add 1
      if (profile.last_listened_date !== today) {
        newStreak += 1;

        // --- NEW: STREAK COMPLETION LOGIC ---
        // 1. Send Push Notification (System Tray)
        sendPushNotification(
          "Streak 🔥",
          `You hit a ${newStreak}-day streak! Keep it up!`,
        );

        // 2. Save Flag for Profile Screen (So we know to celebrate when they visit)
        await AsyncStorage.setItem(
          "streak_celebration_pending",
          newStreak.toString(),
        );
      }

      await supabase
        .from("profiles")
        .update({
          streak_count: newStreak,
          last_listened_date: today,
          total_minutes: (profile.total_minutes || 0) + Math.ceil(seconds / 60),
        })
        .eq("id", user.id);
    }
  }

  // --- NEW: Update Global Play Count ---
  async function incrementGlobalPlays(trackId) {
    try {
      // Calls the SQL function we just made
      const { error } = await supabase.rpc("increment_play_count", {
        song_id: trackId,
      });
      if (error) console.log("Play Count Error:", error.message);
      else console.log("Recorded +1 Play for Song ID:", trackId);
    } catch (e) {
      console.log("Analytics Error:", e);
    }
  }

  // --- BACKGROUND PLAYBACK CONTROL 👮‍♂️ ---
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      // If user goes to Background (Lock Screen/Home) AND is NOT Premium -> PAUSE
      if (
        nextAppState === "background" &&
        !isPremiumRef.current && // <--- USES REF (More Reliable)
        soundRef.current // <--- USES REF
      ) {
        console.log("🔒 Non-Premium User went to background: Pausing...");
        soundRef.current.pauseAsync();
        setIsPlaying(false);
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []); // <--- No dependencies needed anymore!

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  // --- GLOBAL REWARD LOGIC ---
  async function triggerCelebration() {
    setShowCelebration(true);
    Vibration.vibrate(500); // <--- VIBRATE PHONE

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_minutes, points, streak_count")
        .eq("id", user.id)
        .single();

      const currentMins = profile?.total_minutes || 0;
      const currentPoints = profile?.points || 0;

      // 2. LOGIC (Fixed: 10 Points only)
      const newMins = currentMins + 5; // Approx song length
      const newPoints = currentPoints + 10; // Fixed: 10 pts per song (Not 100)

      // 3. Update DB
      await supabase
        .from("profiles")
        .update({ total_minutes: newMins, points: newPoints })
        .eq("id", user.id);

      console.log("Global Reward Triggered! +10 XP");

      // Add this line after updating DB:
      sendPushNotification(
        "Divinity Achieved ✨",
        "You just earned +10 Karma Points! Keep the vibes high.",
      );

      // Hide after 3s
      setTimeout(() => setShowCelebration(false), 3000);
    } catch (e) {
      console.log("Reward Error", e);
    }
  }

  return (
    <PlayerContext.Provider
      value={{
        refreshProfile: checkPremium, // <--- ADD THIS LINE (Connects Shop to Context)
        isPremium, // <--- ADD THIS LINE (Fixes the bug)
        isLifetime, // <--- ADD
        subscriptionExpiry, // <--- ADD
        currentTrack,
        isPlaying,
        position: position * 1000, // Convert s to ms for your UI
        duration: duration * 1000, // Convert s to ms for your UI
        isBuffering,
        playTrackList,
        togglePlayPause,
        playNext,
        closePlayer, // <--- EXPORT THIS
        playPrev,
        seekTo,
        startSleepTimer, // <--- ADD
        sleepMinutes, // <--- ADD
        queue, // <--- ADD
        currentIndex, // <--- ADD
        toggleFavorite, // <--- EXPOSE FUNCTION
        likedTrackIds, // <--- EXPOSE DATA
        triggerCelebration,
        showCelebration,
        setShowCelebration, // <--- ADD THIS LINE
        alertConfig, // <--- Export State
        showAlert, // <--- Export Function
        hideAlert, // <--- Export Function
        fullPlayerVisible: !!currentTrack,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
// Add this at the VERY END of the file to fix the "Missing default export" warning
export default function PlayerContextRoute() {
  return null;
}
