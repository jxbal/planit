// app/signup.js
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { auth } from "../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  setDoc,
  doc,
  collection,
  getDocs,
} from "firebase/firestore";

const db = getFirestore();

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSignUp = () => {
    console.log("Email:", email, "Password:", password); // Log email and password
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        Alert.alert("Sign Up Successful", "Welcome!");
        router.replace("/(auth)");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Sign Up Error:", errorCode, errorMessage); // Log error
        Alert.alert("Sign Up Failed", errorMessage);
      });
  };

  const backToLogin = () => {
    router.push("/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 20 }}>
        <TouchableOpacity style={styles.backButton} onPress={backToLogin}>
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>
        <Text>Email</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{
            marginVertical: 10,
            padding: 10,
            borderColor: "gray",
            borderWidth: 1,
          }}
        />
        <Text>Password</Text>
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            marginVertical: 10,
            padding: 10,
            borderColor: "gray",
            borderWidth: 1,
          }}
        />
        <Button title="Sign Up" onPress={handleSignUp} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 20,
    marginLeft: -20,
    marginTop: -20,
  },
});
