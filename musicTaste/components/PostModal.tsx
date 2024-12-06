import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Text,
  Pressable,
  TextInput,
  Image,
} from "react-native";
import { doc, updateDoc, arrayUnion, getFirestore } from "firebase/firestore";

const db = getFirestore();

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
}

interface PostModalProps {
  visible: boolean;
  onClose: () => void;
  accessToken: string | null;
  profile: any;
  onPostSuccess: () => void;
}

export const PostModal = ({
  visible,
  onClose,
  accessToken,
  profile,
  onPostSuccess,
}: PostModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState(false);
  const [caption, setCap] = useState("");
  const [viewIndex, setViewIndex] = useState(0);
  const [sendPostVisible, setSendPostVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchSpotify = async (query: string) => {
    if (!query.trim() || !accessToken) {
      setTracks([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          query
        )}&type=track&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (data.tracks) {
        setTracks(data.tracks.items);
      }
    } catch (error) {
      console.error("Error searching Spotify:", error);
      Alert.alert("Error", "Failed to search for songs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery === "") {
      setTracks([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      searchSpotify(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, accessToken]);

  const handlePostNow = async () => {
    if (selectedTrack && caption && sendPostVisible && profile?.id) {
      const sanitizedTrack = {
        id: selectedTrack.id,
        name: selectedTrack.name,
      };

      const newPost = {
        track: sanitizedTrack,
        caption: caption,
        image: image,
        albumCover: selectedTrack.album.images[0].url,
        artistName: selectedTrack.artists
          .map((artist) => artist.name)
          .join(", "),
        name: profile?.display_name || "Unknown User",
        username: profile?.id || "Unknown User",
        timestamp: new Date().toLocaleString(),
      };

      try {
        const userDocRef = doc(db, "profiles", profile.id);
        await updateDoc(userDocRef, {
          posts: arrayUnion(newPost),
        });

        onPostSuccess();
        handleClose();
      } catch (error) {
        console.error("Error saving post to Firestore:", error);
        Alert.alert("Error", "Failed to post. Please try again.");
      }
    } else {
      Alert.alert("Error", "Please select a song and add a caption!");
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedTrack(null);
    setImage(null);
    setPhotoModal(false);
    setCap("");
    setViewIndex(0);
    setSendPostVisible(false);
    onClose();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setSelectedTrack(null);
    setSendPostVisible(false);
  };

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    setSendPostVisible(true);
    setSearchQuery("");
  };

  const closeSelectedSong = () => {
    setSelectedTrack(null);
    setSendPostVisible(false);
    setCap("");
  };

  const selectImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setViewIndex(1);
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const takeImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Camera permission is required to take photos."
        );
        return;
      }
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setViewIndex(1);
        setPhotoModal(false);
      }
    } catch (error) {
      console.error("Error taking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  //   useEffect(() => {
  //     const loadPosts = async () => {
  //       if (profile?.id) {
  //         const userDocRef = doc(db, "profiles", profile.id);
  //         const userDocSnap = await getDoc(userDocRef);

  //         if (userDocSnap.exists()) {
  //           setFeed(userDocSnap.data().posts || []);
  //         }
  //       }
  //     };

  //     loadPosts();
  //   }, [profile]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.postView}>
          <Text style={styles.postText}>New Post</Text>
          <Pressable
            style={[styles.postButton, styles.leavePostButton]}
            onPress={handleClose}
          >
            <Ionicons name="close-circle" size={32} color="#A52A2A" />
          </Pressable>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a song..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#666"
            />
            {isLoading && <ActivityIndicator style={styles.loader} />}
          </View>

          <ScrollView style={styles.searchResults}>
            {tracks.map((track) => (
              <TouchableOpacity
                key={track.id}
                style={styles.trackItem}
                onPress={() => handleTrackSelect(track)}
              >
                {track.album.images.length > 0 && (
                  <Image
                    style={styles.trackAlbumCover}
                    source={{ uri: track.album.images[0].url }}
                  />
                )}
                <View style={styles.trackDetails}>
                  <Text style={styles.trackName}>{track.name}</Text>
                  <Text style={styles.artistName}>
                    {track.artists.map((artist) => artist.name).join(", ")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedTrack && (
            <View style={styles.selectedTrackContainer}>
              <TouchableOpacity
                style={styles.closeSong}
                onPress={closeSelectedSong}
              >
                <Ionicons name="close-circle" size={32} color="#A52A2A" />
              </TouchableOpacity>
              <Text style={styles.selectedTrackTitle}>Selected Song:</Text>
              {/* <PreviewPlayer
                          trackId={selectedTrack.id}
                          accessToken={accessToken}
                        /> */}
              <Text style={styles.selectedTrackName}>{selectedTrack.name}</Text>
              <Text style={styles.selectedTrackArtist}>
                {selectedTrack.artists.map((artist) => artist.name).join(", ")}
              </Text>
              {selectedTrack.album.images.length > 0 && (
                <Image
                  style={styles.albumCover}
                  source={{ uri: selectedTrack.album.images[0].url }}
                />
              )}
            </View>
          )}

          {sendPostVisible && (
            <>
              {/* <ThemedText style={styles.postText}>Add a Caption</ThemedText> */}
              <View style={styles.photoContainer}>
                <TouchableOpacity
                  style={styles.addPhoto}
                  // onPress={selectImage}
                  onPress={() => setPhotoModal(true)}
                >
                  {photoModal && (
                    <Modal
                      animationType="slide"
                      transparent={true}
                      visible={photoModal}
                      onRequestClose={() => setPhotoModal(false)}
                    >
                      <View style={styles.photoModalContainer}>
                        <View style={styles.photoModalContent}>
                          <View style={styles.photoModalHeader}>
                            <Text style={styles.photoModalTitle}>
                              Choose Photo Option
                            </Text>
                            <TouchableOpacity
                              onPress={() => setPhotoModal(false)}
                            >
                              <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            style={styles.photoModalButton}
                            onPress={takeImage}
                          >
                            <Ionicons
                              name="camera"
                              size={24}
                              color="#A52A2A"
                              style={styles.photoModalIcon}
                            />
                            <Text style={styles.photoModalButtonText}>
                              Take Photo
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.photoModalButton}
                            onPress={selectImage}
                          >
                            <Ionicons
                              name="image"
                              size={24}
                              color="#A52A2A"
                              style={styles.photoModalIcon}
                            />
                            <Text style={styles.photoModalButtonText}>
                              Choose from Library
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  )}
                  <Text style={styles.addPhotoText}>Add a Photo</Text>
                  {image && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="white"
                      style={styles.checkmarkIcon}
                    />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.captionContainer}>
                <TextInput
                  style={styles.caption}
                  placeholder="Add a caption..."
                  placeholderTextColor="#666"
                  value={caption}
                  onChangeText={setCap}
                />
              </View>
              <View style={styles.sendPostButtonContainer}>
                <TouchableOpacity
                  style={styles.sendPostButton}
                  onPress={handlePostNow}
                >
                  <Text style={styles.sendPostButtonText}>Post Now</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1,
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  postView: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "90%",
    maxWidth: 500,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  postText: {
    color: "black",
    marginTop: 30,
    fontSize: 25,
  },
  postButton: {
    marginTop: 22,
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 0,
    top: 0,
  },
  checkmarkIcon: {
    marginLeft: 10,
  },
  leavePostButton: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 0,
    top: 0,
  },
  searchContainer: {
    width: "90%",
    marginTop: 20,
    position: "relative",
  },
  searchInput: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    width: "100%",
  },
  loader: {
    position: "absolute",
    right: 10,
    top: 12,
  },
  trackItem: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  searchResults: {
    maxHeight: 200,
    marginBottom: 20,
  },
  trackAlbumCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  trackDetails: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },
  trackName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    width: 200,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  artistName: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    width: 200,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  selectedTrackContainer: {
    width: "90%",
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginTop: 20,
  },
  closeSong: {
    position: "absolute",
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    right: 0,
    top: 0,
  },
  selectedTrackTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  selectedTrackName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  selectedTrackArtist: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  albumCover: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: "center",
  },
  photoContainer: {
    width: "100%", // Remove flex: 1
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  addPhoto: {
    backgroundColor: "#A52A2A",
    marginTop: -10,
    width: 280,
    borderRadius: 8,
    alignItems: "center",
  },
  photoModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  photoModalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "80%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  photoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  photoModalButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    marginBottom: 10,
  },
  photoModalButtonText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  photoModalIcon: {
    marginRight: 5,
  },
  sendPostButton: {
    backgroundColor: "#A52A2A",
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: 250,
    alignItems: "center",
  },
  sendPostButtonText: {
    color: "white",
    fontSize: 25,
  },
  sendPostButtonContainer: {
    backgroundColor: "#A52A2A",
    borderRadius: 8,
    width: "90%",
    marginTop: 0,
    alignItems: "center",
  },
  captionContainer: {
    width: "90%",
    marginTop: 25,
    position: "relative",
    height: 100,
  },
  caption: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    height: 80,
    width: "100%",
  },
  addPhotoText: {
    color: "white",
    fontSize: 20,
  },
});
