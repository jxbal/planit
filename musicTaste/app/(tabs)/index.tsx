
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { Text, Modal, Alert, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import SpotifyAuth from "../../spotifySongSearch";
import { PostModal } from "@/components/PostModal";
import {
  getFirestore,
  setDoc,
  doc,
  arrayUnion,
  updateDoc,
  getDoc,
  collection,
  limit,
  where,
  query,
  getDocs,
} from "firebase/firestore";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import * as Localization from "expo-localization";
import { StackActions } from "@react-navigation/native";

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

interface UserProfile {
  id: string;
  name: string;
  profile_photo?: string;
  username: string;
}

export default function MainPage() {
  const [postButtonVisible, setPostButtonVisible] = useState(true);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [profiles, setProfiles] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchUserModal, setSearchUserModal] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    fetchPosts(profile.id);
    setRefreshing(false);
  };

  async function movePostsToArchived(userID: string) {
    const userDocRef = doc(db, "profiles", userID);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const posts = userDocSnap.data().posts || [];
      const archivedPostsRef = doc(db, "users", userID);

      await setDoc(
        archivedPostsRef,
        {
          archivedPosts: arrayUnion(...posts),
        },
        { merge: true }
      );

      await updateDoc(userDocRef, {
        posts: [],
      });
      console.log("Posts moved to archived successfully");
    }
  }

  const getTimezoneOffset = () => {
    const timezone = Localization.timezone;
    const date = new Date();

    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "short",
    });

    const parts = formatter.formatToParts(date);
    const timezoneOffset = parts.find(
      (part) => part.type === "timeZoneName"
    )?.value;

    const sign = timezoneOffset?.charAt(3) === "+" ? 1 : -1;
    const offsetHours = parseInt(timezoneOffset?.slice(4, 6) || "0", 10);
    const offsetMinutes = parseInt(timezoneOffset?.slice(7, 9) || "0", 10);

    return sign * (offsetHours * 60 + offsetMinutes);
  };

  function isMidnight() {
    const userTimezoneOffset = getTimezoneOffset();
    const now = new Date();
    const adjustedNow = new Date(now.getTime() + userTimezoneOffset * 60000);

    return adjustedNow.getHours() === 0 && adjustedNow.getMinutes() === 0;
  }

  useEffect(() => {
    if (!profile?.id) return;

    const intervalId = setInterval(() => {
      if (isMidnight()) {
        movePostsToArchived(profile.id)
          .then(() => {
            setFeed([]);
            setPostButtonVisible(true);
          })
          .catch((error) => {
            console.error("Error moving posts to archived:", error);
            Alert.alert(
              "Error",
              "Failed to move posts to archived. Please try again."
            );
          });
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [profile]);

  const fetchPosts = async (userID: string) => {
    try {
      const userDocRef = doc(db, "profiles", userID);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userPosts = userData.posts || [];

        setFeed(userPosts);
        if (userPosts.length > 0) {
          setPostButtonVisible(false);
        }
      } else {
        console.log("No such user document!");
        setFeed([]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      Alert.alert("Error", "Failed to fetch posts. Please try again.");
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchPosts(profile.id);
    }
  }, [profile]);

  interface TokenFetchedHandler {
    (token: string): void;
  }

  const handleTokenFetched: TokenFetchedHandler = (token) => {
    if (!accessToken) {
      setAccessToken(token);
    }
  };

  const openModal = () => {
    setPostModalVisible(true);
  };

  const openSearchUserModal = () => {
    setSearchUserModal(true);
  };

  const closeSearchUserModal = () => {
    setSearchUserModal(false);
  };

  const closeModal = () => {
    setPostModalVisible(false);
    setPostButtonVisible(true);
  };

  const searchUserProfile = async (userSearchQuery: string) => {
    if (!userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const userDocRef = collection(db, "users");
      const q = query(
        userDocRef,
        where("username", ">=", userSearchQuery.toLowerCase()),
        where("username", "<=", userSearchQuery.toLowerCase() + "\uf8ff"),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const results: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        results.push({
          id: doc.id,
          name: userData?.name || "Unknown User",
          profile_photo: userData.profile_photo || null,
          username: userData.username || doc.id,
        });
      });
      setUserSearchResults(results);
    } catch (error) {
      console.error("error fetching profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUserProfile(userSearchQuery);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

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

  useEffect(() => {
    const fetchProfile = async () => {
      const profileData = await fetchSpotifyProfile();
      if (profileData) setProfile(profileData);
    };
    fetchProfile();
  }, []);

  const handleUserSearch = (text: string) => {
    setUserSearchQuery(text);
  };

  useEffect(() => {
    const loadPosts = async () => {
      if (profile?.id) {
        const userDocRef = doc(db, "profiles", profile.id);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setFeed(userDocSnap.data().posts || []);
        }
      }
    };

    loadPosts();
  }, [profile]);

  return (
    <LinearGradient colors={["#ffffff", "#d9b3b3"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeAreaViewHome}>
        <View style={{ flex: 1 }}>
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              ></RefreshControl>
            }
          >
            <View style={styles.mainPage}>
              <SpotifyAuth onTokenFetched={handleTokenFetched} />
              {postButtonVisible && (
                <TouchableOpacity style={styles.postButton} onPress={openModal}>
                  <Ionicons name="add-circle" size={40} color="#A52A2A" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.searchButton}
                onPress={openSearchUserModal}
              >
                <Ionicons
                  name="search-circle"
                  size={43}
                  color="#A52A2a"
                ></Ionicons>
              </TouchableOpacity>

              <Modal
                animationType="slide"
                transparent={true}
                visible={searchUserModal}
                onRequestClose={closeSearchUserModal}
              >
                <View style={styles.searchUserModalContainer}>
                  <View style={styles.searchUserView}>
                    <Text style={styles.searchUserModalText}>
                      Search for a User
                    </Text>
                    <TouchableOpacity
                      style={styles.closeSearchUserModal}
                      onPress={closeSearchUserModal}
                    >
                      <Ionicons name="close-circle" size={32} color="#A52A2A" />
                    </TouchableOpacity>
                    <View style={styles.userSearchBarContainer}>
                      <TextInput
                        style={styles.userSearchBar}
                        placeholder="Search for a User..."
                        value={userSearchQuery}
                        onChangeText={handleUserSearch}
                        placeholderTextColor="#666"
                      ></TextInput>
                      {isLoading && (
                        <ActivityIndicator style={styles.userSearchLoader} />
                      )}
                    </View>
                    <ScrollView style={styles.userSearchResults}>
                      {userSearchResults.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          style={styles.userItem}
                          onPress={() => {
                            // Handle user selection here
                            setProfile(user);
                            closeSearchUserModal();
                          }}
                        >
                          <View style={styles.userProfilePhoto}>
                            {user.profile_photo ? (
                              <Image
                                source={{ uri: user.profile_photo }}
                                style={styles.profileImage}
                              />
                            ) : (
                              <View style={styles.defaultProfileImage}>
                                <Ionicons
                                  name="person"
                                  size={24}
                                  color="#666"
                                />
                              </View>
                            )}
                          </View>
                          <View style={styles.userDetails}>
                            <Text style={styles.userDisplayName}>
                              {user.name}
                            </Text>
                            <Text style={styles.userUsername}>
                              @{user.username}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
              <PostModal
                visible={postModalVisible}
                onClose={closeModal}
                accessToken={accessToken}
                profile={profile}
                onPostSuccess={() => {
                  setFeed((prevFeed) => [...prevFeed]);
                  setPostButtonVisible(false);
                  closeModal();
                }}
              />
              <ThemedText style={styles.username}>
                Hi @{profile?.display_name || "username"}
              </ThemedText>
              <View style={styles.feedContainer}>
                <ThemedText style={styles.friendsText}>Feed</ThemedText>
                <View style={styles.feed}>
                  <ScrollView style={styles.feedScroll}>
                    {feed.map((post, index) => (
                      <View key={index} style={styles.post}>
                        <Text style={styles.usernamePost}>
                          {profile?.display_name || "username"}
                        </Text>
                        <View style={styles.postHeader}>
                          <Image
                            source={{ uri: post.albumCover }}
                            style={styles.albumCoverImage}
                          />
                          <View style={styles.postDetails}>
                            <Text style={styles.postArtistName}>
                              {post.artistName}
                            </Text>
                            <Text style={styles.postedTrackName}>
                              {post.track.name}
                            </Text>
                          </View>
                          {/* <PreviewPlayer
                            trackId={selectedTrack.id}
                            accessToken={accessToken}
                          /> */}
                        </View>
                        <Text style={styles.postCaption}>{post.caption}</Text>
                        {post.image && (
                          <Image
                            source={{ uri: post.image }}
                            style={styles.postImage}
                          />
                        )}
                        <Text style={styles.postTimestamp}>
                          {post.timestamp}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <View style={styles.trendingView}>
                {/* <ThemedText style={styles.trendingText}>Trending</ThemedText> */}
              </View>
              <View style={styles.recommendationsView}>
                {/* <ThemedText style={styles.recommendationsText}>Recommendations</ThemedText> */}
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // mainScroll: {backgroundColor: '#ffffff'},
  safeAreaViewHome: {
    flex: 1,
  },
  mainPage: {
    flex: 1,
    paddingHorizontal: 20,
    // backgroundColor: '#ffffff',
  },
  username: {
    marginTop: 40,
    fontSize: 25,
    color: "#800000",
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
  searchButton: {
    marginTop: 22,
    marginRight: 50,
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 0,
    top: 0,
  },
  selectedTrackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  searchUserModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1,
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  searchUserView: {
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
  searchUserModalText: {
    fontSize: 25,
    paddingVertical: 20,
  },
  userSearchResults: {
    width: "100%",
    maxHeight: 300,
    marginTop: 10,
  },
  userItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  userProfilePhoto: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  defaultProfileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  userDetails: {
    flex: 1,
  },
  userDisplayName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  userUsername: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  userSearchBarContainer: {
    width: "100%",
    paddingVertical: 10,
  },
  userSearchBar: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    width: "100%",
  },
  closeSearchUserModal: { marginTop: -35, marginRight: -300 },
  // userSearchBarContainer: {
  //   width: 300,
  //   paddingVertical: 10,
  // },
  // userSearchBar: {
  //   backgroundColor: "#f0f0f0",
  //   padding: 12,
  //   borderRadius: 8,
  //   fontSize: 16,
  //   width: "100%",
  // },
  loader: {
    position: "absolute",
    right: 10,
    top: 12,
  },
  userSearchLoader: {
    position: "absolute",
    right: 10,
    top: 20,
  },
  checkmarkIcon: {
    position: "absolute",
    right: 10,
    top: 0,
  },
  feedScroll: {
    marginBottom: 20,
  },
  post: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  postTrackName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  postCaption: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  postImage: {
    marginTop: 10,
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  postTimestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 10,
  },
  feedContainer: {
    marginTop: 50,
    // backgroundColor: '#ffffff',
  },
  feed: {
    marginTop: 30,
  },
  friendsText: {
    fontSize: 25,
    color: "#800000",
  },
  friendsScroll: {
    paddingHorizontal: 10,
  },
  friendName: {
    fontSize: 18,
    color: "#fff",
    marginHorizontal: 15,
  },
  friendsButton: {
    backgroundColor: "#ffffff",
  },
  friendsButtonText: {
    color: "#ffffff",
  },
  trendingView: {
    marginTop: 30,
    backgroundColor: "#ffffff",
  },
  trendingText: {
    fontSize: 25,
  },
  recommendationsView: {
    marginTop: 50,
    backgroundColor: "#ffffff",
  },
  recommendationsText: {
    fontSize: 25,
  },
  albumCoverImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 300,
  },
  usernamePost: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    padding: 10,
    marginTop: -10,
    marginLeft: -10,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  postDetails: {
    marginLeft: -290,
  },
  postArtistName: {
    fontWeight: "bold",
    fontSize: 14,
  },
  postedTrackName: {
    fontSize: 12,
    color: "#555",
    marginRight: 30,
  },
});
