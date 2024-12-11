import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Text,
  Alert,
  SafeAreaView,
} from "react-native";
import * as AuthSession from "expo-auth-session";
import { ResponseType } from "expo-auth-session";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import axios from "axios";
import { doc, setDoc, getFirestore, getDoc } from "firebase/firestore";
import { fetchSpotifyProfile } from "../../fetchSpotifyProfile";

const CLIENT_ID = "d442d42b1e6f4b37ad8305f045d5d160";
const db = getFirestore();

// Replace with your actual reverse proxy redirect URI
const REDIRECT_URI =
  "https://us-central1-music-taste-bdec8.cloudfunctions.net/redirectProxy";

// Spotify API endpoint
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "token";
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-currently-playing",
  "user-read-playback-state",
  // Add other scopes as needed
];

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spotifyUserID, setSpotifyUserID] = useState<string | null>(null);

  // Configure the Spotify login request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      responseType: ResponseType.Token,
      extraParams: {
        show_dialog: "true",
        state: spotifyUserID || "no_user", // Use Spotify User ID or a placeholder
      },
    },
    {
      authorizationEndpoint: AUTH_ENDPOINT,
    }
  );

  const fetchSpotifyUserID = async (accessToken: string): Promise<string | null> => {
    try {
      const profile = await fetchSpotifyProfile();
      if (profile) {
        console.log("Spotify User ID fetched:", profile.id);
        return profile.id;
      } else {
        console.error("Failed to fetch Spotify profile");
        return null;
      }
    } catch (error) {
      console.error("Error fetching Spotify user ID:", error);
      return null;
    }
  };
    
  const saveUserToFirestore = async (
    userID: string,
    username: string,
    name: string,
    redirectURI: string
  ) => {
    try {
      const userDocRef = doc(db, "profiles", userID);
      const userDocSnap = await getDoc(userDocRef);

      const existingURIs = userDocSnap.exists()
        ? userDocSnap.data().redirectURIs || []
        : [];
      const updatedURIs = Array.from(new Set([...existingURIs, redirectURI]));

      await setDoc(
        userDocRef,
        {
          username,
          name,
          redirectURIs: updatedURIs,
          followers: [],
          following: [],
        },
        { merge: true }
      );

      console.log(`User ${username} saved to Firestore successfully.`);
    } catch (error) {
      console.error("Error saving user to Firestore:", error);
    }
  };

  // const fetchSpotifyUserIDFromToken = async (): Promise<string | null> => {
  //   try {
  //     const token = await SecureStore.getItemAsync("spotify_token");
  //     if (!token) {
  //       console.error("No token found for Spotify user.");
  //       return null;
  //     }
  
  //     const userInfoResponse = await axios.get("https://api.spotify.com/v1/me", {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  
  //     return userInfoResponse.data.id;
  //   } catch (error) {
  //     console.error("Error fetching Spotify user ID:", error);
  //     return null;
  //   }
  // };
  
  const handleSpotifyLogin = async () => {
    try {
      if (!request) {
        Alert.alert("Error", "Spotify login is not configured.");
        return;
      }
  
      // Dynamically fetch Spotify User ID or use placeholder
      let stateValue = spotifyUserID || "no_user";
      if (!spotifyUserID) {
        const token = await SecureStore.getItemAsync("spotify_token");
        if (token) {
          const fetchedSpotifyUserID = await fetchSpotifyUserID(token);
          if (fetchedSpotifyUserID) {
            setSpotifyUserID(fetchedSpotifyUserID);
            stateValue = fetchedSpotifyUserID;
          }
        }
      }
  
      // Log the dynamically updated state value
      console.log("State being sent:", stateValue);
  
      // Update the AuthRequest with the correct state
      const updatedRequest = {
        ...request,
        extraParams: {
          ...request.extraParams,
          state: stateValue, // Use the fetched Spotify User ID as state
        },
      };
  
      // Prompt for Spotify login
      const result = await promptAsync();
      if (result?.type === "success") {
        const { access_token } = result.params;
        console.log("Access Token received:", access_token);
  
        // Store the access token securely
        await SecureStore.setItemAsync("spotify_token", access_token);
  
        // Fetch Spotify User ID and save it to Firestore
        const fetchedSpotifyUserID = await fetchSpotifyUserID(access_token);
        if (fetchedSpotifyUserID) {
          setSpotifyUserID(fetchedSpotifyUserID);
          await saveUserToFirestore(
            fetchedSpotifyUserID,
            "username_placeholder",
            "name_placeholder",
            REDIRECT_URI
          );
          Alert.alert("Success", "Successfully logged in with Spotify!");
          router.replace("/(tabs)");
        } else {
          Alert.alert(
            "Error",
            "Unable to fetch Spotify user ID. Please try again."
          );
        }
      } else if (result?.type === "error") {
        console.error("Auth error:", result.error);
        Alert.alert(
          "Authentication Error",
          result.error?.message || "Something went wrong"
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Failed to initialize Spotify login.");
    }
  };  
  
  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        router.replace("/(tabs)");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
  
        if (errorCode === "auth/invalid-email") {
          Alert.alert("Login Failed", "Invalid email address format.");
        } else if (errorCode === "auth/user-not-found") {
          Alert.alert("Login Failed", "No user found with this email.");
        } else if (errorCode === "auth/wrong-password") {
          Alert.alert("Login Failed", "Incorrect password.");
        } else {
          Alert.alert("Login Failed", errorMessage);
        }
      });
  };

  console.log("State being sent:", spotifyUserID || "no_user");
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Nonstop!</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="Login" onPress={handleLogin} />
        <Button title="Sign Up" onPress={() => router.push("/signup")} />

        <View style={styles.separator} />
        <Button
          title="Login with Spotify"
          color="#1DB954"
          onPress={handleSpotifyLogin}
          disabled={!request}
        />

        {accessToken && (
          <Text
            style={styles.tokenText}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            Token: {accessToken}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  title: {
    padding: 30,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 50,
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  separator: {
    marginVertical: 10,
  },
  tokenText: {
    marginTop: 10,
    fontSize: 12,
    color: "#666",
  },
});

export default LoginPage;
