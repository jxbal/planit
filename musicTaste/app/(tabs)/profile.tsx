import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image, Modal, TextInput, Button } from "react-native";
import { getFirestore, setDoc, doc, collection, getDocs } from "firebase/firestore";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const db = getFirestore();

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
}

interface Album {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
}

async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await SecureStore.getItemAsync("spotify_token");
  if (!accessToken) {
    Alert.alert("Error", "Spotify access token is missing. Please log in again.");
    return null;
  }
  return accessToken;
}

async function fetchSpotifyProfile(): Promise<any> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  try {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching Spotify profile:", error);
    return null;
  }
}

async function saveFavoriteToFirestore(type: string, item: Track | Album, userId: string) {
  try {
    const imageUrl =
      (type === "songs" && "album" in item ? item.album.images?.[0]?.url : null) ||
      (type === "albums" && "images" in item ? item.images?.[0]?.url : null) ||
      "";

    await setDoc(
      doc(db, "users", userId, type, item.id),
      {
        id: item.id,
        name: item.name,
        artists: item.artists.map((artist) => artist.name).join(", "),
        imageUrl: imageUrl || "",
      },
      { merge: true }
    );
    console.log(`Favorite ${type} saved to Firestore:`, item.name);
  } catch (error) {
    console.error(`Error saving ${type} to Firestore:`, error);
  }
}

async function getCurrentlyPlaying(): Promise<any> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  const url = "https://api.spotify.com/v1/me/player/currently-playing";
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.status === 204 || !response.data) {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching currently playing track:", error);
    return null;
  }
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [favoriteSongs, setFavoriteSongs] = useState<Track[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [albumSearchModalVisible, setAlbumSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [songSearchResults, setSongSearchResults] = useState<Track[]>([]);
  const [albumSearchResults, setAlbumSearchResults] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFavoriteSongs = async (userId: string) => {
    try {
      const songsCollection = collection(db, "users", userId, "songs");
      const querySnapshot = await getDocs(songsCollection);
      const songs = querySnapshot.docs.map((doc) => doc.data() as Track);
      setFavoriteSongs(songs);
    } catch (error) {
      console.error("Error fetching favorite songs:", error);
    }
  };

  useEffect(() => {
    const initializeProfile = async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return;

      try {
        const response = await axios.get("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setProfile(response.data);

        // Fetch favorite songs
        const userId = response.data.id;
        fetchFavoriteSongs(userId);
      } catch (error) {
        console.error("Error fetching Spotify profile:", error);
      }
    };

    initializeProfile();
  }, []);
  
  const handleAddFavorite = async (type: string, item: Track | Album) => {
    const userId = await SecureStore.getItemAsync("userProfile");
    if (!userId) {
      console.error("User ID not found.");
      return;
    }

    if (type === "songs" && "album" in item) {
      setFavoriteSongs((prev) => [...prev, item as Track]);
    } else if (type === "albums" && "images" in item) {
      setFavoriteAlbums((prev) => [...prev, item as Album]);
    }

    await saveFavoriteToFirestore(type, item, userId);
  };

  const handleSearchSongs = async () => {
    if (!searchQuery.trim()) return; // Avoid showing "No results" if nothing was typed.

    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery.trim())}&type=track&limit=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSongSearchResults(response.data.tracks.items || []);
    } catch (error) {
      console.error("Error searching Spotify for songs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchAlbums = async () => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=album&limit=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setAlbumSearchResults(response.data.albums.items || []);
    } catch (error) {
      console.error("Error searching Spotify for albums:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image
          source={{
            uri: profile?.images?.[0]?.url || "https://via.placeholder.com/100",
          }}
          style={styles.profilePic}
        />
        <Text style={styles.name}>{profile?.display_name || "User"}</Text>
        <Text style={styles.username}>@{profile?.id || "unknown"}</Text>
        <Text style={styles.description}>Music lover & Spotify fan</Text>
      </View>

      {/* Now Playing */}
      {nowPlaying && (
        <View style={styles.nowPlaying}>
          <Text style={styles.sectionTitle}>Now Playing</Text>
          <Text>
            {nowPlaying.item.name} - {nowPlaying.item.artists.map((artist: any) => artist.name).join(", ")}
          </Text>
        </View>
      )}

      {/* Favorite Songs Section */}
      <Text style={styles.sectionTitle}>Favorite Songs</Text>
      <View style={styles.grid}>
        {favoriteSongs.map((song, index) => (
          <View key={index} style={styles.gridItem}>
            {song.album?.images?.[0]?.url ? (
              <Image source={{ uri: song.album.images[0].url }} style={styles.gridImage} />
            ) : (
              <View style={[styles.gridImage, { backgroundColor: "#555" }]} />
            )}
            <Text style={styles.gridText}>{song.name}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.gridItem} onPress={() => setSearchModalVisible(true)}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>
  
      {/* Favorite Albums */}
      <Text style={styles.sectionTitle}>Favorite Albums</Text>
      <View style={styles.grid}>
        {favoriteAlbums.map((album, index) => (
          <View key={index} style={styles.gridItem}>
            {album.images?.[0]?.url ? (
              <Image source={{ uri: album.images[0].url }} style={styles.gridImage} />
            ) : (
              <View style={[styles.gridImage, { backgroundColor: "#555" }]} /> //placeholder
            )}
            <Text style={styles.gridText}>{album.name || "Unknown Album"}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.gridItem} onPress={() => setAlbumSearchModalVisible(true)}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search Modal for Songs */}
      <Modal visible={searchModalVisible} transparent animationType="slide">
        <View style={styles.modal}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a song..."
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
          <Button title="Search" onPress={handleSearchSongs} />
          {isLoading ? (
            <Text style={{ color: "#fff", textAlign: "center" }}>Loading...</Text>
          ) : songSearchResults.length > 0 ? (
            <FlatList
              data={songSearchResults}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.trackItem}
                  onPress={() => {
                    setFavoriteSongs((prev) => [...prev, item]);
                    setSearchModalVisible(false);
                  }}
                >
                  <Image source={{ uri: item.album.images[0]?.url }} style={styles.albumCover} />
                  <Text style={styles.trackName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
            />
          ) : searchQuery.trim() ? (
            <Text style={{ color: "#fff", textAlign: "center", marginTop: 20 }}>No results found.</Text>
          ) : null}

          <TouchableOpacity
            onPress={() => {
              setSearchModalVisible(false);
              setSearchQuery("");
              setSongSearchResults([]);
            }}
          >
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Search Modal for Albums */}
      <Modal visible={albumSearchModalVisible} transparent animationType="slide">
        <View style={styles.modal}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for an album..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Button title="Search" onPress={handleSearchAlbums} />
          {isLoading ? (
            <Text>Loading...</Text>
          ) : (
            <FlatList
              data={albumSearchResults}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.trackItem}
                  onPress={() => {
                    handleAddFavorite("albums", item);
                    setAlbumSearchModalVisible(false);
                  }}
                >
                  <Image source={{ uri: item.images[0]?.url }} style={styles.albumCover} />
                  <View>
                    <Text style={styles.albumName}>{item.name}</Text>
                    <Text style={styles.artistName}>
                      {item.artists.map((artist) => artist.name).join(", ")}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
            />
          )}
          <TouchableOpacity onPress={() => {
            console.log("closing album modal");
            setAlbumSearchModalVisible(false);
          }}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#700505", padding: 20 },
  header: { alignItems: "center", marginBottom: 20 },
  profilePic: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  name: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  username: { fontSize: 16, color: "#aaa" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginVertical: 10 },
  description: { fontSize: 14, color: "#aaa", textAlign: "center", marginVertical: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridItem: { width: "30%", margin: 5, alignItems: "center", padding: 10 },
  gridImage: { width: "100%", aspectRatio: 1, borderRadius: 10, marginBottom: 5 },
  gridText: { color: "#fff", fontSize: 12, textAlign: "center" },
  modal: { flex: 1, backgroundColor: "#700505", padding: 10, justifyContent: "center" },
  searchInput: { backgroundColor: "#fff", padding: 10, marginVertical: 10 },
  trackItem: { flexDirection: "row", alignItems: "center", marginVertical: 5 },
  albumCover: { width: 50, height: 50, marginRight: 10 },
  trackName: { color: "#fff", fontSize: 14 },
  closeButton: { color: "#1DB954", textAlign: "center", marginVertical: 20 },
  albumName: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  artistName: { color: "#aaa", fontSize: 12 },
  nowPlaying: { marginVertical: 20, padding: 10, backgroundColor: "#333", borderRadius: 10 },
  addText: { fontSize: 24, color: "#fff", textAlign: "center" },  
});

export default ProfilePage;
