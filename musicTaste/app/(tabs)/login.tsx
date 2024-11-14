// LoginPage.js
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user data from Firestore
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        Alert.alert('Welcome', `Hello, ${userData.name}!`);
      } else {
        console.log('No such document!');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      Alert.alert('Login Error', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#121212' }}>
      <TextInput
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        style={{
          marginBottom: 12,
          padding: 12,
          borderWidth: 1,
          borderRadius: 4,
          borderColor: '#bbb',
          backgroundColor: '#222',
          color: '#fff'
        }}
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        style={{
          marginBottom: 12,
          padding: 12,
          borderWidth: 1,
          borderRadius: 4,
          borderColor: '#bbb',
          backgroundColor: '#222',
          color: '#fff'
        }}
        secureTextEntry
      />
      <Button title="Log In" onPress={handleLogin} color="#6200ee" />
    </View>
  );
};

export default LoginPage;
