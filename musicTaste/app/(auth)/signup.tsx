// app/signup.js
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from "expo-router";
import { auth } from "../../firebaseConfig";
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSignUp = () => {
    console.log('Email:', email, 'Password:', password); // Log email and password
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        Alert.alert('Sign Up Successful', 'Welcome!');
        router.replace('/(auth)');
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Sign Up Error:', errorCode, errorMessage); // Log error
        Alert.alert('Sign Up Failed', errorMessage);
      });
  };
  

  return (
    <View style={{ padding: 20 }}>
      <Text>Sign Up</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ marginVertical: 10, padding: 10, borderColor: 'gray', borderWidth: 1 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ marginVertical: 10, padding: 10, borderColor: 'gray', borderWidth: 1 }}
      />
      <Button title="Sign Up" onPress={handleSignUp} />
    </View>
  );
}
