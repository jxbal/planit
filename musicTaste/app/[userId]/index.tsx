import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  collection,
  getDocs,
  DocumentData,
} from "firebase/firestore";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

interface UserProfile {
  name: string;
  username: string;
  profilePhoto?: string;
  followers?: string[];
  following?: string[];
}

interface UserStats {
  followers: number;
  following: number;
  favoriteSongs: SongData[];
  favoriteAlbums: AlbumData[];
}

interface SongData {
  name: string;
  artist: string;
  imageUrl: string;
}

interface AlbumData {
  name: string;
  artist: string;
  imageUrl: string;
}

const db = getFirestore();

export default function OtherUserProfile() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    followers: 0,
    following: 0,
    favoriteSongs: [],
    favoriteAlbums: [],
  });

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentUser = await SecureStore.getItemAsync("userProfile");
        setCurrentUserId(currentUser);

        const [userData, followStatus, songs, albums] = await Promise.all([
          fetchUserProfile(),
          checkFollowStatus(currentUser),
          fetchUserCollection<SongData>("songs"),
          fetchUserCollection<AlbumData>("albums"),
        ]);

        setProfile(userData as UserProfile);

        setIsFollowing(followStatus);

        setUserStats({
          followers: userData?.followers?.length || 0,
          following: userData?.following?.length || 0,
          favoriteSongs: songs,
          favoriteAlbums: albums,
        });

      } catch (err) {
        console.error("Error initializing profile:", err);
        setError("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      initialize();
    }
  }, [userId]);

  const fetchUserProfile = async (): Promise<UserProfile> => {
    const userDocRef = doc(db, "users", userId as string);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap) {
      throw new Error("User not found");
    }
    return userDocSnap.data() as UserProfile;
  };

  const fetchUserCollection = async <T extends DocumentData>(
    collectionName: string
  ): Promise<T[]> => {
    const collectionRef = collection(
      db,
      "users",
      userId as string,
      collectionName
    );
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map((doc) => doc.data() as T);
  };

  const checkFollowStatus = async (
    currentUserId: string | null
  ): Promise<boolean> => {
    if (!currentUserId) return false;
    const userDoc = await getDoc(doc(db, "users", userId as string));
    return (
      userDoc.exists() && userDoc.data().followers?.includes(currentUserId)
    );
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      Alert.alert("Error", "You must be logged in to follow users");
      return;
    }

    try {
      const targetUserRef = doc(db, "users", userId as string);
      const currentUserRef = doc(db, "users", currentUserId);

      if (isFollowing) {
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUserId),
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId),
        });
        setUserStats((prev) => ({
          ...prev,
          followers: prev.followers - 1,
        }));
      } else {
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUserId),
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId),
        });
        setUserStats((prev) => ({
          ...prev,
          followers: prev.followers + 1,
        }));
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Error updating follow status:", error);
      Alert.alert("Error", "Failed to update follow status");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A52A2A" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <Image
            source={{
              uri: profile?.profilePhoto || "https://via.placeholder.com/100",
            }}
            style={styles.profilePic}
          />
          <Text style={styles.name}>{profile?.name || "User"}</Text>
          <Text style={styles.username}>@{profile?.username || "unknown"}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{userStats.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{userStats.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollow}
          >
            <Text style={styles.followButtonText}>
              {isFollowing ? "Unfollow" : "Follow"}
            </Text>
          </TouchableOpacity>
        </View>

        {userStats.favoriteSongs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Songs</Text>
            {userStats.favoriteSongs.map((song, index) => (
              <View key={index} style={styles.songItem}>
                <Image
                  source={{ uri: song.imageUrl }}
                  style={styles.songCover}
                />
                <View style={styles.songInfo}>
                  <Text style={styles.songName}>{song.name}</Text>
                  <Text style={styles.artistName}>{song.artist}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {userStats.favoriteAlbums.length > 0 && (
          <View style={styles.albumSection}>
            <Text style={styles.albumSectionTitle}>Favorite Albums</Text>
            {userStats.favoriteAlbums.map((album, index) => (
              <View key={index} style={styles.albumItem}>
                <Image
                  source={{ uri: album.imageUrl }}
                  style={styles.albumCover}
                />
                <View style={styles.albumInfo}>
                  <Text style={styles.albumName}>{album.name}</Text>
                  <Text style={styles.artistName}>{album.artist}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#700505",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#A52A2A",
    marginBottom: 20,
  },
  header: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    color: "#fff",
  },
  profileInfo: {
    alignItems: "center",
    padding: 20,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#fff",
  },
  username: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  stat: {
    alignItems: "center",
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 14,
    color: "#fff",
  },
  followButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  followingButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
  },
  followButtonText: {
    color: "#700505",
    fontSize: 16,
    fontWeight: "bold",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#fff",
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    color: "#fff",
  },
  songCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  songInfo: {
    marginLeft: 12,
  },
  songName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  artistName: {
    fontSize: 14,
    color: "#fff",
  },
  albumSection: {
    padding: 16,
  },
  albumSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#fff",
  },
  albumItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    color: "#fff",
  },
  albumCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  albumInfo: {
    marginLeft: 12,
  },
  albumName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  backButtonText: {
    color: "fff",
    backgroundColor: "#fff",
  },
});
