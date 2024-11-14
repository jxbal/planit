import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { db } from '../../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const ProfilePage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileData, setProfileData] = useState({});

  // Save data to Firestore
  const saveProfile = async () => {
    try {
      const docRef = doc(db, 'profiles', 'userProfile');
      await setDoc(docRef, { name, email });
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // Fetch data from Firestore
  const fetchProfile = async () => {
    try {
      const docRef = doc(db, 'profiles', 'userProfile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfileData(docSnap.data());
      } else {
        console.log('No such document!');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Profile Page</Text>
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <Button title="Save Profile" onPress={saveProfile} />

      {profileData.name && (
        <View style={styles.profileContainer}>
          <Text style={styles.profileHeading}>Saved Profile</Text>
          <Text>Name: {profileData.name}</Text>
          <Text>Email: {profileData.email}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 24,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 16,
    borderRadius: 4,
  },
  profileContainer: {
    marginTop: 32,
  },
  profileHeading: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProfilePage;
