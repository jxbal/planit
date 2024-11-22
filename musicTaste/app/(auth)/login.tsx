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

const CLIENT_ID = "d442d42b1e6f4b37ad8305f045d5d160";
const CLIENT_SECRET = "9f641cacf31e4745a6fd9a0d3de5e951";

const db = getFirestore();

const developmentRedirectURI = AuthSession.makeRedirectUri({
  scheme: "musictaste",
  path: "spotify-auth",
});

// Production URI
const productionRedirectURI = AuthSession.makeRedirectUri({
  scheme: "musictaste",
  path: "spotify-auth",
});

// Log both URIs to see what needs to be registered
console.log("Development Redirect URI:", developmentRedirectURI);
console.log("Production Redirect URI:", productionRedirectURI);

// Use the development URI during development
const REDIRECT_URI = developmentRedirectURI;

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

  // Configure the authentication request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      responseType: ResponseType.Token,
      extraParams: {
        show_dialog: "true",
      },
    },
    {
      authorizationEndpoint: AUTH_ENDPOINT,
    }
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { access_token } = response.params;
      SecureStore.setItemAsync("spotify_token", access_token)
        .then(() => {
          Alert.alert("Success", "Successfully logged in with Spotify!");
          fetchSpotifyUserID(access_token);
          router.replace("/(tabs)");
        })
        .catch((error) => {
          console.error("Error storing the access token", error);
          Alert.alert("Storage Error", "Failed to save token securely");
        });
    } else if (response?.type === "error") {
      Alert.alert(
        "Authentication error",
        response.error?.message || "Something went wrong"
      );
    }
  }, [response]);

  const fetchSpotifyUserID = async (accessToken: string) => {
    try {
      const userInfoResponse = await axios.get(
        "https://api.spotify.com/v1/me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const spotifyUserID = userInfoResponse.data.id;
      const username = userInfoResponse.data.id;
      const name = userInfoResponse.data.display_name || username;
      await SecureStore.setItemAsync("userProfile", spotifyUserID);
      await saveUserToFirestore(spotifyUserID, username, name);
      console.log("Spotify user ID stored as userProfile:", spotifyUserID);
    } catch (error) {
      console.error("Error fetching Spotify user ID:", error);
    }
  };

  async function saveUserToFirestore(
    userID: string,
    username: string,
    name: string
  ) {
    try {
      // First, try to retrieve the existing document to preserve posts
      const userDocRef = doc(db, "profiles", userID);
      const userDocSnap = await getDoc(userDocRef);
      const usersDocRef = doc(db, "users", userID);
      const usersDocSnap = await getDoc(usersDocRef);

      // Get existing posts if they exist
      const existingPosts = userDocSnap.exists()
        ? userDocSnap.data().posts || []
        : [];
      const archivedPosts = usersDocSnap.exists()
        ? usersDocSnap.data().archivesPosts || []
        : [];

      console.log("Attempting to save user:", { userID, username, name });
      await setDoc(
        userDocRef,
        {
          username: username,
          name: name,
          followers: [],
          following: [],
          posts: existingPosts,
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "users", userID),
        {
          username: username,
          name: name,
          archivedPosts: archivedPosts,
        },
        { merge: true }
      );
      console.log(`New user ${username} saved to Firestore successfully`);
    } catch (error) {
      console.error("Detailed Firestore save error:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
      }
    }
  }
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

  const handleSignUp = () => {
    router.push("/signup");
  };

  const handleSpotifyLogin = async () => {
    try {
      const result = await promptAsync();
      if (result.type === "error") {
        console.error("Auth error:", result.error);
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Failed to initialize Spotify login");
    }
  };

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
        <Button title="Sign Up" onPress={handleSignUp} />

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
    backgroundColor: "#f0f0f0", // Matches the container background
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
