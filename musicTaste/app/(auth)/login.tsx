import React, { useState, useEffect } from "react";
import { View, TextInput, Button, StyleSheet, Text, Alert } from "react-native";
import * as AuthSession from "expo-auth-session";
import { ResponseType } from "expo-auth-session";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

const CLIENT_ID = "d442d42b1e6f4b37ad8305f045d5d160";
const CLIENT_SECRET = "9f641cacf31e4745a6fd9a0d3de5e951";

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
      // Add extra parameters as needed
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

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        router.replace("/(tabs)");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
  
        if (errorCode === 'auth/invalid-email') {
          Alert.alert("Login Failed", "Invalid email address format.");
        } else if (errorCode === 'auth/user-not-found') {
          Alert.alert("Login Failed", "No user found with this email.");
        } else if (errorCode === 'auth/wrong-password') {
          Alert.alert("Login Failed", "Incorrect password.");
        } else {
          Alert.alert("Login Failed", errorMessage);
        }
      });
  };

  const handleSignUp = () => {
    router.push('/signup');
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
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

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
        <Text style={styles.tokenText} numberOfLines={1} ellipsizeMode="middle">
          Token: {accessToken}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  title: {
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
