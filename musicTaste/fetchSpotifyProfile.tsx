import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

// Helper to get a valid access token
export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await SecureStore.getItemAsync("spotify_token");
  if (!accessToken) {
    Alert.alert("Error", "Spotify access token is missing. Please log in again.");
    return null;
  }
  return accessToken;
}

// Fetch Spotify profile
export async function fetchSpotifyProfile(): Promise<any | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  try {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Save Spotify User ID in SecureStore for easy access
    await SecureStore.setItemAsync("spotifyUserID", response.data.id);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching Spotify profile:", error.response?.data || error.message);
    } else {
      console.error("Error fetching Spotify profile:", error);
    }
    return null;
  }
}
