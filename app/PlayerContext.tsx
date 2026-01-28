import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Vibration } from "react-native";
import { supabase } from "../supabaseConfig";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const router = useRouter(); // <--- NEW
  const soundRef = useRef(null); // <--- NEW (To track sound even during logout)
  const currentTrackRef = useRef(null);
  // FIX: Track specific IDs to prevent infinite loops when navigating
  const lastFinishedIdRef = useRef(null);
  // FIX: Use a Set to track ALL songs rewarded in this session (Prevents infinite loop)
  const rewardedSongIds = useRef(new Set());
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]); // List of songs
  const [currentIndex, setCurrentIndex] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  // ✅ ADD THESE TWO LINES:
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
    // A. Enable Background Audio for the App
    async function configureAudio() {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true, // Critical for Premium
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.log("Audio Config Error:", e);
      }
    }
    configureAudio();

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
      if (sound) await sound.unloadAsync();

      // Reset finish tracker for the new song
      lastFinishedIdRef.current = null;
      // ✅ BUSINESS LOGIC UPDATE:
      // Allow rewarding this song again. If they listen to 90% of it again, they deserve the points.
      // If we don't delete this, they only get points ONCE per app session (which is bad for retention).
      rewardedSongIds.current.delete(track.id);

      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: shouldPlay },
        onPlaybackStatusUpdate,
      );

      setSound(newSound);
      soundRef.current = newSound; // <--- KEEP REF IN SYNC
      currentTrackRef.current = track; // <--- UPDATE REF HERE
      setCurrentTrack(track);
      setIsPlaying(shouldPlay);
    } catch (error) {
      console.log("Error loading track:", error);
    }
  }

  const onPlaybackStatusUpdate = async (status) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.isPlaying);

      // --- FIX: REWARD LOGIC (Use Set to prevent duplicates) ---
      if (
        status.durationMillis > 0 &&
        status.positionMillis > status.durationMillis * 0.8 &&
        currentTrackRef.current &&
        !rewardedSongIds.current.has(currentTrackRef.current.id) // <--- PREVENTS LOOPING
      ) {
        rewardedSongIds.current.add(currentTrackRef.current.id); // <--- ADD TO LIST
        triggerCelebration();
      }

      // --- FINISH LOGIC ---
      if (status.didJustFinish) {
        if (
          currentTrackRef.current &&
          lastFinishedIdRef.current !== currentTrackRef.current.id
        ) {
          lastFinishedIdRef.current = currentTrackRef.current.id;

          // A. Update Stats
          updateStats(currentTrackRef.current.duration);
          incrementGlobalPlays(currentTrackRef.current.id);

          // B. MISSION COMPLETE LOGIC
          if (currentTrackRef.current.isMission) {
            const today = new Date().toISOString().split("T")[0];
            // 1. Save locally so Home Screen knows immediately
            await AsyncStorage.setItem("mission_completed_date", today);

            // 2. Update DB
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              const { data: p } = await supabase
                .from("profiles")
                .select("points")
                .eq("id", user.id)
                .single();
              if (p) {
                await supabase
                  .from("profiles")
                  .update({ points: (p.points || 0) + 50 })
                  .eq("id", user.id);
                // Add this:
                sendPushNotification(
                  "Sankalp Fulfilled 🎯",
                  "Mission Complete! +50 Karma Points added to your soul.",
                );
                Vibration.vibrate([0, 500, 200, 500]); // Success Vibrate
              }
            }
          }
        }
        playNext();
      }
    }
  };

  async function playTrackList(tracks, index) {
    setQueue(tracks);
    setCurrentIndex(index);
    await loadTrack(tracks[index]);
  }

  // NEW: Close Player Function ❌
  const closePlayer = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  async function togglePlayPause() {
    if (!sound) return;

    // FIX: If song finished, replay from start
    if (position >= duration && duration > 0) {
      // Allow earning reward again on replay (Optional - remove this line if you want 1 reward per session)
      if (currentTrackRef.current) {
        rewardedSongIds.current.delete(currentTrackRef.current.id);
      }

      await sound.replayAsync();
      setIsPlaying(true);
      return;
    }

    if (isPlaying) await sound.pauseAsync();
    else await sound.playAsync();
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
    if (sound) await sound.setPositionAsync(millis);
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
      if (nextAppState === "background" && !isPremium && isPlaying && sound) {
        sound.pauseAsync();
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
  }, [isPremium, isPlaying, sound]);

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
        position,
        duration,
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
