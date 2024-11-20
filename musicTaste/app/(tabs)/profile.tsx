// import React from 'react';
// import { View, Button, StyleSheet, Alert } from 'react-native';
// import { launchImageLibrary } from 'react-native-image-picker';
// import { storage } from '../../firebaseConfig'; // Import the storage from your firebase config

// // Function to choose an image
// const chooseImage = () => {
//   launchImageLibrary({ mediaType: 'photo', quality: 1 }, response => {
//     if (response.didCancel) {
//       console.log('User canceled image picker');
//     } else if (response.errorCode) {
//       console.log('ImagePicker Error: ', response.errorMessage);
//     } else {
//       const path = response.assets[0].uri; // Get the file path from the response
//       uploadImageToFirebase(path); // Upload the selected image
//     }
//   });
// };

// // Function to upload image to Firebase Storage
// const uploadImageToFirebase = async (uri) => {
//   const fileName = uri.split('/').pop(); // Extract file name from the URI
//   const reference = storage.ref('images/' + fileName); // Define the path in Firebase Storage

//   try {
//     // Create a file blob from the URI (important for React Native)
//     const response = await fetch(uri);
//     const blob = await response.blob();

//     // Upload the file
//     const uploadTask = reference.put(blob);

//     // Monitor upload progress
//     uploadTask.on('state_changed', taskSnapshot => {
//       console.log(`Transferred: ${taskSnapshot.bytesTransferred} / ${taskSnapshot.totalBytes}`);
//     });

//     // Wait for the upload to finish
//     await uploadTask;

//     // Get the download URL after the upload is complete
//     const downloadUrl = await reference.getDownloadURL();
//     console.log('File available at: ', downloadUrl);

//     // You can now save the download URL in Firestore or use it as needed
//   } catch (error) {
//     console.log('Error uploading image: ', error);
//     Alert.alert('Upload failed', 'An error occurred while uploading the image.');
//   }
// };

// // Handle save button click
// const handleSave = () => {
//   chooseImage(); // Trigger image selection
// };

// const Profile = () => {
//   return (
//     <View style={styles.container}>
//       <Button title="Store Profile Image" onPress={handleSave} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 20,
//     backgroundColor: '#f0f0f0',
//   },
// });

// export default Profile;


// interface Track {
//   id: string;
//   name: string;
//   artists: { name: string }[];
//   album: {
//     images: { url: string }[];
//   };
// }

// const ProfilePage = ({ userId }: { userId: string }) => {
//   const [profile, setProfile] = useState<any>({});
//   const [nowPlaying, setNowPlaying] = useState<any>({});
//   const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
//   const [favoriteSongs, setFavoriteSongs] = useState<Track[]>([]);
//   const [favoriteAlbums, setFavoriteAlbums] = useState<any[]>([]);
//   const [favoriteArtists, setFavoriteArtists] = useState<any[]>([]);

//   useEffect(() => {
//     // Fetch profile, now playing, and recently played data when the component mounts
//     fetchProfileData();
//     loadFavorites();
//   }, []);

//   const fetchProfileData = async () => {
//     // Assume Spotify API calls to fetch profile, now playing, and recently played tracks
//     // Set the retrieved data to the respective state variables
//   };

//   const loadFavorites = async () => {
//     const songs = await getFavorites(userId, 'songs');
//     const albums = await getFavorites(userId, 'albums');
//     const artists = await getFavorites(userId, 'artists');

//     setFavoriteSongs(songs);
//     setFavoriteAlbums(albums);
//     setFavoriteArtists(artists);
//   };

//   const handleAddFavorite = (type: string, item: Track) => {
//     addFavorite(userId, type, item).then(loadFavorites); // Reload favorites after adding
//   };

//   const handleRemoveFavorite = (type: string, itemId: string) => {
//     removeFavorite(userId, type, itemId).then(loadFavorites); // Reload favorites after removing
//   };

//   return (
//     <View style={styles.container}>
//       {/* Profile Header */}
//       <View style={styles.header}>
//         <Image source={{ uri: profile.images ? profile.images[0]?.url : '' }} style={styles.profilePic} />
//         <Text style={styles.name}>{profile.display_name}</Text>
//         <Text style={styles.username}>@{profile.id}</Text>
//         <Text style={styles.description}>Music lover & Spotify fan</Text>
//       </View>

//       {/* Now Playing */}
//       {nowPlaying && (
//         <View style={styles.nowPlaying}>
//           <Text style={styles.sectionTitle}>Now Playing</Text>
//           <Text>{nowPlaying.name} - {nowPlaying.artists?.map((artist: any) => artist.name).join(', ')}</Text>
//         </View>
//       )}

//       {/* Recently Played */}
//       <View style={styles.recentlyPlayed}>
//         <Text style={styles.sectionTitle}>Recently Played</Text>
//         <FlatList
//           data={recentlyPlayed}
//           renderItem={({ item }) => (
//             <View style={styles.trackItem}>
//               <Image source={{ uri: item.album.images[0].url }} style={styles.trackImage} />
//               <Text style={styles.trackName}>{item.name}</Text>
//               <Text style={styles.artistName}>{item.artists.map(artist => artist.name).join(', ')}</Text>
//               <TouchableOpacity onPress={() => handleAddFavorite('songs', item)}>
//                 <Text style={styles.addText}>Add to Favorites</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//           keyExtractor={(item) => item.id}
//           horizontal
//         />
//       </View>

//       {/* Favorites */}
//       <Text style={styles.sectionTitle}>Favorite Songs</Text>
//       <FlatList
//         data={favoriteSongs}
//         renderItem={({ item }) => (
//           <View style={styles.item}>
//             <Text style={styles.itemText}>{item.name}</Text>
//             <TouchableOpacity onPress={() => handleRemoveFavorite('songs', item.id)}>
//               <Text style={styles.removeText}>Remove</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//         keyExtractor={(item) => item.id}
//       />

//       {/* Additional sections for Favorite Albums and Favorite Artists */}
//       {/* Repeat similar structure for Favorite Albums and Favorite Artists */}

//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#121212', padding: 20 },
//   header: { alignItems: 'center', marginBottom: 20 },
//   profilePic: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
//   name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
//   username: { fontSize: 16, color: '#aaa' },
//   description: { fontSize: 14, color: '#bbb', textAlign: 'center' },
//   sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginVertical: 10 },
//   nowPlaying: { padding: 10, backgroundColor: '#333', borderRadius: 10, marginBottom: 20 },
//   recentlyPlayed: { marginBottom: 20 },
//   trackItem: { alignItems: 'center', marginRight: 10 },
//   trackImage: { width: 80, height: 80, borderRadius: 8 },
//   trackName: { fontSize: 14, color: '#fff', textAlign: 'center' },
//   artistName: { fontSize: 12, color: '#aaa', textAlign: 'center' },
//   addText: { color: '#1DB954', marginTop: 5 },
//   item: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#f0f0f0', marginVertical: 5 },
//   itemText: { fontSize: 16 },
//   removeText: { color: 'red' },
// });

// export default ProfilePage;
