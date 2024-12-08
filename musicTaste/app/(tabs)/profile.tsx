import React, { useEffect, useState } from "react";
import { RefreshControl } from "react-native";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
  TextInput,
  Button,
  SafeAreaView,
  ScrollView,
} from "react-native";
import {
  getFirestore,
  setDoc,
  doc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import CalendarPicker from "@/components/PreviouslyPosted";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import UserListModal from "@/components/userListModal";
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
    Alert.alert(
      "Error",
      "Spotify access token is missing. Please log in again."
    );
    return null;
  }
  return accessToken;
}

async function removeFavoriteSongFromFirestore(songId: string, userId: string) {
  try {
    const songDocRef = doc(db, "users", userId, "songs", songId);

    await deleteDoc(songDocRef);
    console.log(`Song with ID ${songId} removed from Firestore.`);
  } catch (error) {
    console.error("Error removing song from Firestore:", error);
  }
}

async function removeFavoriteAlbumFromFirestore(
  albumId: string,
  userId: string
) {
  try {
    const albumDocRef = doc(db, "users", userId, "albums", albumId);

    await deleteDoc(albumDocRef);
    console.log(`Album with ID ${albumId} removed from Firestore.`);
  } catch (error) {
    console.error("Error removing song from Firestore:", error);
  }
}

async function saveProfilePhotoToFirestore(userId: string, photoUrl: string) {
  try {
    await setDoc(
      doc(db, "users", userId),
      { profilePhoto: photoUrl },
      { merge: true }
    );
    console.log("Profile photo saved to Firestore.");
  } catch (error) {
    console.error("Error saving profile photo to Firestore:", error);
  }
}

async function saveFavoriteToFirestore(
  type: string,
  item: Track | Album,
  userId: string
) {
  try {
    const imageUrl =
      (type === "songs" && "album" in item
        ? item.album.images?.[0]?.url
        : null) ||
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
  const [deleteSong, setDeleteSong] = useState(false);
  const [deleteAlbum, setDeleteAlbum] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<string[]>([]);
  const [followingList, setFollowingList] = useState<string[]>([]);

  const onRefresh = async () => {
    if (!profile || !profile.id) {
      console.error("Profile data is not available for refresh.");
      setRefreshing(false);
      return;
    }

    try {
      setRefreshing(true);
      await Promise.all([
        fetchFavoriteSongs(profile.id),
        fetchFavoriteAlbums(profile.id),
      ]);
    } catch (error) {
      console.error("Error refreshing content:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const checkForRefresh = async () => {
        const needsRefresh = await SecureStore.getItemAsync(
          "profile_needs_refresh"
        );
        if (needsRefresh === "true") {
          await SecureStore.deleteItemAsync("profile_needs_refresh");
          onRefresh();
        }
      };

      checkForRefresh();
    }, [onRefresh])
  );

  const fetchFirebaseUserData = async (userId: string) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFollowers(userData.followers?.length || 0);
        setFollowing(userData.following?.length || 0);
        setFollowersList(userData.followers || []);
        setFollowingList(userData.following || []);
      }
    } catch (error) {
      console.error("Error fetching Firebase user data:", error);
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
        const userProfile = response.data;
        setProfile(userProfile);

        const userId = userProfile.id;
        const photoUrl = userProfile?.images?.[0]?.url || "";

        if (photoUrl) {
          await saveProfilePhotoToFirestore(userId, photoUrl);
        }

        await Promise.all([
          fetchFavoriteSongs(userId),
          fetchFavoriteAlbums(userId),
          fetchFirebaseUserData(userId),
        ]);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    initializeProfile();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;

    const userDocRef = doc(db, "users", profile.id);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setFollowers(userData.followers?.length || 0);
        setFollowing(userData.following?.length || 0);
        setFollowersList(userData.followers || []);
        setFollowingList(userData.following || []);
      }
    });

    return () => unsubscribe();
  }, [profile?.id]);

  const fetchFavoriteSongs = async (userId: string) => {
    try {
      const songsCollection = collection(db, "users", userId, "songs");
      const querySnapshot = await getDocs(songsCollection);
      const songs = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          name: data.name,
          artists: data.artists,
          album: { images: [{ url: data.imageUrl }] },
        } as Track;
      });
      setFavoriteSongs(songs);
    } catch (error) {
      console.error("Error fetching favorite songs:", error);
    }
  };

  const fetchFavoriteAlbums = async (userId: string) => {
    try {
      const albumsCollection = collection(db, "users", userId, "albums");
      const querySnapshot = await getDocs(albumsCollection);
      const albums = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          name: data.name,
          artists: data.artists,
          images: [{ url: data.imageUrl }],
        } as Album;
      });
      setFavoriteAlbums(albums);
    } catch (error) {
      console.error("Error fetching favorite albums:", error);
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
        const userProfile = response.data;
        setProfile(userProfile);

        const userId = userProfile.id;
        const photoUrl = userProfile?.images?.[0]?.url || "";

        if (photoUrl) {
          await saveProfilePhotoToFirestore(userId, photoUrl);
        }

        fetchFavoriteSongs(userId);
        fetchFavoriteAlbums(userId);
      } catch (error) {
        console.error("Error fetching Spotify profile:", error);
      }
    };

    initializeProfile();
  }, []);

  const handleRemoveFavoriteSong = async (songId: string) => {
    const userId = await SecureStore.getItemAsync("userProfile");
    if (!userId) {
      console.error("User ID not found.");
      return;
    }
    await removeFavoriteSongFromFirestore(songId, userId);
    setFavoriteSongs((prev) => prev.filter((song) => song.id !== songId));
  };

  const handleRemoveFavoriteAlbum = async (albumId: string) => {
    const userId = await SecureStore.getItemAsync("userProfile");
    if (!userId) {
      console.error("User ID not found.");
      return;
    }
    await removeFavoriteAlbumFromFirestore(albumId, userId);
    setFavoriteAlbums((prev) => prev.filter((album) => album.id !== albumId));
  };

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
    if (!searchQuery.trim()) return;

    const accessToken = await getValidAccessToken();
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          searchQuery.trim()
        )}&type=track&limit=10`,
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
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          searchQuery
        )}&type=album&limit=10`,
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
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          ></RefreshControl>
        }
      >
        <View style={styles.container}>
          {/* Profile Header */}
          <View style={styles.header}>
            <Image
              source={{
                uri:
                  profile?.images?.[0]?.url ||
                  "https://via.placeholder.com/100",
              }}
              style={styles.profilePic}
            />
            <Text style={styles.name}>{profile?.display_name || "User"}</Text>
            <Text style={styles.username}>@{profile?.id || "unknown"}</Text>
            <Text style={styles.description}>Music lover & Spotify fan</Text>
          </View>

          <View style={styles.follow}>
            <TouchableOpacity
              style={styles.followers}
              onPress={() => setShowFollowersModal(true)}
            >
              <Text style={styles.followersText}>{followers}</Text>
              <Text style={styles.followersLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.following}
              onPress={() => setShowFollowingModal(true)}
            >
              <Text style={styles.followingText}>{following}</Text>
              <Text style={styles.followingLabel}>Following</Text>
            </TouchableOpacity>
          </View>
          <UserListModal
            visible={showFollowersModal}
            onClose={() => setShowFollowersModal(false)}
            userIds={followersList}
            title="Followers"
          />

          <UserListModal
            visible={showFollowingModal}
            onClose={() => setShowFollowingModal(false)}
            userIds={followingList}
            title="Following"
          />

          {/* Now Playing */}
          {nowPlaying && (
            <View style={styles.nowPlaying}>
              <Text style={styles.sectionTitle}>Now Playing</Text>
              <Text>
                {nowPlaying.item.name} -{" "}
                {nowPlaying.item.artists
                  .map((artist: any) => artist.name)
                  .join(", ")}
              </Text>
            </View>
          )}

          {/* Favorite Songs Section */}
          <View style={styles.favoriteSongsView}>
            <Text style={styles.sectionTitle}>Favorite Songs</Text>
            {favoriteSongs.length > 0 &&
              (!deleteSong ? (
                <TouchableOpacity
                  style={styles.editSongs}
                  onPress={() => setDeleteSong(true)}
                >
                  <Text style={styles.editSongsText}>edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setDeleteSong(false)}>
                  <Ionicons name="checkmark" size={24} color="#fff"></Ionicons>
                </TouchableOpacity>
              ))}
          </View>
          <View style={styles.grid}>
            {favoriteSongs.map((song, index) => (
              <View key={index} style={styles.gridItem}>
                {song.album?.images?.[0]?.url ? (
                  <Image
                    source={{ uri: song.album.images[0].url }}
                    style={styles.gridImage}
                  />
                ) : (
                  <View
                    style={[styles.gridImage, { backgroundColor: "#555" }]}
                  />
                )}
                {deleteSong && (
                  <TouchableOpacity
                    style={styles.closeFavorite}
                    onPress={() => handleRemoveFavoriteSong(song.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#000" />
                  </TouchableOpacity>
                )}
                <Text style={styles.gridText}>{song.name}</Text>
              </View>
            ))}
            {favoriteSongs.length < 3 && (
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => setSearchModalVisible(true)}
              >
                <Text style={styles.addText}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Favorite Albums */}
          <View style={styles.favoriteAlbumsView}>
            <Text style={styles.sectionTitle}>Favorite Albums</Text>
            {favoriteAlbums.length > 0 &&
              (!deleteAlbum ? (
                <TouchableOpacity
                  style={styles.editAlbums}
                  onPress={() => setDeleteAlbum(true)}
                >
                  <Text style={styles.editSongsText}>edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setDeleteAlbum(false)}>
                  <Ionicons name="checkmark" size={24} color="#fff"></Ionicons>
                </TouchableOpacity>
              ))}
          </View>
          <View style={styles.grid}>
            {favoriteAlbums.map((album, index) => (
              <View key={index} style={styles.gridItem}>
                {album.images?.[0]?.url ? (
                  <Image
                    source={{ uri: album.images[0].url }}
                    style={styles.gridImage}
                  />
                ) : (
                  <View
                    style={[styles.gridImage, { backgroundColor: "#555" }]}
                  />
                )}
                {deleteAlbum && (
                  <TouchableOpacity
                    style={styles.closeFavorite}
                    onPress={() => handleRemoveFavoriteAlbum(album.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#000" />
                  </TouchableOpacity>
                )}
                <Text style={styles.gridText}>
                  {album.name || "Unknown Album"}
                </Text>
              </View>
            ))}
            {favoriteAlbums.length < 3 && (
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => setAlbumSearchModalVisible(true)}
              >
                <Text style={styles.addText}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Modal for Songs */}
          <SafeAreaView>
            <Modal
              visible={searchModalVisible}
              transparent
              animationType="slide"
            >
              <View style={styles.modal}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a song..."
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
                />
                <Button title="Search" onPress={handleSearchSongs} />
                {isLoading ? (
                  <Text style={{ color: "#fff", textAlign: "center" }}>
                    Loading...
                  </Text>
                ) : songSearchResults.length > 0 ? (
                  <FlatList
                    data={songSearchResults}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.trackItem}
                        onPress={async () => {
                          await handleAddFavorite("songs", item);
                          setSearchModalVisible(false);
                        }}
                      >
                        <Image
                          source={{ uri: item.album.images[0]?.url }}
                          style={styles.albumCover}
                        />
                        <Text style={styles.trackName}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id}
                  />
                ) : searchQuery.trim() ? (
                  <Text
                    style={{
                      color: "#fff",
                      textAlign: "center",
                      marginTop: 20,
                    }}
                  >
                    No results found.
                  </Text>
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
          </SafeAreaView>

          {/* Search Modal for Albums */}
          <SafeAreaView>
            <Modal
              visible={albumSearchModalVisible}
              transparent
              animationType="slide"
            >
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
                    renderItem={({ item }) =>
                      item && item.id && item.images?.[0]?.url ? (
                        <TouchableOpacity
                          style={styles.trackItem}
                          onPress={() => {
                            handleAddFavorite("albums", item);
                            setAlbumSearchModalVisible(false);
                          }}
                        >
                          <Image
                            source={{ uri: item.images[0].url }}
                            style={styles.albumCover}
                          />
                          <View>
                            <Text style={styles.albumName}>{item.name}</Text>
                            <Text style={styles.artistName}>
                              {item.artists
                                .map((artist) => artist.name)
                                .join(", ")}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ) : null
                    }
                    keyExtractor={(item) => item?.id || "unknown"}
                  />
                )}
                <TouchableOpacity
                  onPress={() => {
                    console.log("closing album modal");
                    setAlbumSearchModalVisible(false);
                  }}
                >
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>
            </Modal>
          </SafeAreaView>

          {/* previously posted calendar */}
          <View style={styles.calendarViewContainer}>
            <Text style={styles.previouslyPostedText}>Previosuly Posted: </Text>
            <CalendarPicker userId={profile?.id}></CalendarPicker>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#700505",
  },
  container: { backgroundColor: "#700505", padding: 20 },
  header: { alignItems: "center", marginBottom: 20 },
  profilePic: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  name: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  username: { fontSize: 16, color: "#aaa" },
  favoriteSongsView: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 10,
  },
  editSongs: { marginTop: 12 },
  editSongsText: { color: "#fff" },
  favoriteAlbumsView: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 10,
  },
  editAlbums: { marginTop: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 10,
  },
  closeFavorite: {
    color: "white",
    marginTop: -153,
    marginLeft: 60,
    paddingVertical: 64.6,
  },
  description: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginVertical: 5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: { width: "30%", margin: 5, alignItems: "center", padding: 10 },
  gridImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 5,
  },
  gridText: { color: "#fff", fontSize: 12, textAlign: "center" },
  modal: {
    flex: 1,
    backgroundColor: "#700505",
    padding: 10,
    justifyContent: "center",
  },
  searchInput: { backgroundColor: "#fff", padding: 10, marginVertical: 10 },
  trackItem: { flexDirection: "row", alignItems: "center", marginVertical: 5 },
  albumCover: { width: 50, height: 50, marginRight: 10 },
  trackName: { color: "#fff", fontSize: 14 },
  closeButton: { color: "#1DB954", textAlign: "center", marginVertical: 20 },
  albumName: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  artistName: { color: "#aaa", fontSize: 12 },
  nowPlaying: {
    marginVertical: 20,
    padding: 10,
    backgroundColor: "#333",
    borderRadius: 10,
  },
  addText: { fontSize: 24, color: "#fff", textAlign: "center" },
  calendarViewContainer: {
    flex: 1,
  },
  previouslyPostedText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 10,
    marginLeft: 20,
  },
  follow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 15,
  },
  followers: { alignItems: "center", marginLeft: 95 },
  following: { alignItems: "center", marginRight: 95 },
  followersLabel: { color: "white", fontWeight: "bold" },
  followingLabel: { color: "white", fontWeight: "bold" },
  followersText: { color: "white", fontSize: 18 },
  followingText: { color: "white", fontSize: 18 },
});

export default ProfilePage;
