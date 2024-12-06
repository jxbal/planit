import React, { useState, useEffect } from "react";
import { TouchableOpacity, ActivityIndicator, View } from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

interface PreviewPlayerProps {
  trackId: string;
  accessToken: string | null;
  size?: number;
  color?: string;
}

const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  trackId,
  accessToken,
  size = 24,
  color = "#A52A2A",
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.error("Error initializing audio:", err);
        setError("Failed to initialize audio");
      }
    };

    initAudio();
  }, []);

  // Cleanup sound on unmount or trackId change
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound, trackId]);

  const getPreviewUrl = async () => {
    if (!accessToken) {
      setError("No access token available");
      return null;
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.preview_url) {
        setError("No preview available for this track");
        return null;
      }

      return data.preview_url;
    } catch (error) {
      console.error("Error fetching preview URL:", error);
      setError("Failed to fetch preview URL");
      return null;
    }
  };

  const togglePlayback = async () => {
    if (!accessToken) {
      setError("No access token available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (sound) {
        // Handle existing sound
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
      } else {
        // Create new sound
        const previewUrl = await getPreviewUrl();

        if (!previewUrl) {
          setIsLoading(false);
          return;
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: previewUrl },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              if (status.didJustFinish) {
                setIsPlaying(false);
              }
            }
          }
        );

        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error playing preview:", error);
      setError("Failed to play preview");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        onPress={togglePlayback}
        disabled={isLoading}
        style={{ padding: 8 }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={color} />
        ) : isPlaying ? (
          <Ionicons name="pause" size={size} color={color} />
        ) : (
          <Ionicons name="play" size={size} color={color} />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default PreviewPlayer;
