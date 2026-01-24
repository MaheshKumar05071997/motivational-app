import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// Your Actual Keys
const supabaseUrl = "https://bjglxqnvuuuzoeqmfism.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZ2x4cW52dXV1em9lcW1maXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODM5MjMsImV4cCI6MjA4NDU1OTkyM30.A7nVFXg3nQ99syZZdOOAcSh02yN25v1jNDEJnx3Nltw";

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // This logic prevents crashes on Web/Server by checking if we are on Mobile (Native) or Web
        storage:
            Platform.OS === "web"
                ? typeof window !== "undefined"
                    ? window.localStorage
                    : null
                : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
