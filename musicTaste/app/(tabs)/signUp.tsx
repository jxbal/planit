// import React, { useState } from 'react';
// import { View, TextInput, Button, Alert } from 'react-native';
// import { createUserWithEmailAndPassword } from 'firebase/auth';
// import { doc, setDoc } from 'firebase/firestore';
// import { db, auth } from '../../firebaseConfig'; // Import your initialized Firestore and Auth

// const SignupPage = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [name, setName] = useState('');

//   const handleSignUp = async () => {
//     try {
//       // Create user with email and password
//       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;

//       // Save user data to Firestore
//       await setDoc(doc(db, 'users', user.uid), {
//         name,
//         email,
//         createdAt: new Date(),
//       });

//       Alert.alert('Success', 'User registered successfully!');
//     } catch (error) {
//       console.error('Error signing up:', error);
//       Alert.alert('Error', error.message);
//     }
//   };

//   return (
//     <View>
//       <TextInput
//         placeholder="Name"
//         value={name}
//         onChangeText={setName}
//         style={{ marginBottom: 12, padding: 8, borderWidth: 1 }}
//       />
//       <TextInput
//         placeholder="Email"
//         value={email}
//         onChangeText={setEmail}
//         style={{ marginBottom: 12, padding: 8, borderWidth: 1 }}
//         keyboardType="email-address"
//       />
//       <TextInput
//         placeholder="Password"
//         value={password}
//         onChangeText={setPassword}
//         style={{ marginBottom: 12, padding: 8, borderWidth: 1 }}
//         secureTextEntry
//       />
//       <Button title="Sign Up" onPress={handleSignUp} />
//     </View>
//   );
// };

// export default SignupPage;
