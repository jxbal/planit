import { StyleSheet, ScrollView, Dimensions, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { Text, Modal, Alert, Pressable, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import SpotifyAuth from "../../spotifySongSearch";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';



const friendsList = ["owen", "johnson", "kelly", "juan", "joanna", "friend", "friend", "friend"];
//when we have friends list from database, we can fill this list dynamically

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

const windowWidth = Dimensions.get('window').width;

export default function MainPage() {
    const [buttonVisible, setButtonVisible] = useState(false);
    const [postButtonVisible, setPostButtonVisible] = useState(true);
    const [postModalVisible, setPostModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
    const [sendPostVisible, setSendPostVisible] = useState(false);
    const [caption, setCap] = useState('')
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [image, setImage] = useState<string | null>(null);
    const [viewIndex, setViewIndex] = useState(0);
    const [feed, setFeed] = useState<any[]>([]);

    const handlePostNow = () => {
        if (selectedTrack && caption && sendPostVisible) {
          const newPost = {
            track: selectedTrack,
            caption: caption,
            image: image,
            albumCover: selectedTrack.album.images[0].url,
            artistName: selectedTrack.artists.map(artist => artist.name).join(', '),
            // username: profile?.display_name || 'Unknown User',
            timestamp: new Date().toLocaleString(),
          };
    
          setFeed([newPost, ...feed]); // Add new post to the top of the feed
          closeModal();  // Reset modal state after posting
          setPostButtonVisible(false)
        } else {
          alert("Please select a song and add a caption!");
        }
      };

    interface TokenFetchedHandler {
        (token: string): void;
    }
    const [draftModal, setDraftModal] = useState(false);

    const handleTokenFetched: TokenFetchedHandler = (token) => {
        if (!accessToken) {
            setAccessToken(token);
        }
    };

    const handleContentSizeChange = (width: number) => {
        setButtonVisible(width > windowWidth);
    }

    const openModal = () => {
        setPostModalVisible(true);
        setPostButtonVisible(false);
    }

    const closeModal = () => {
        // if (selectedTrack === null) {
            setPostModalVisible(false);
            setPostButtonVisible(true);
        // }
        // else {
        //     setDraftModal(true);
        // }
    }

    // const resetModalState = () => {
    //     setPostModalVisible(false);
        // setPostButtonVisible(true);
        // setSelectedTrack(null);
        // setCap('');
        // setSendPostVisible(false);
        // setTracks([]);
        // setSearchQuery('');
        // setDraftModal(false);
    // };

    const searchSpotify = async (query: string) => {
        if (!query.trim()) {
            setTracks([]);
            return;
        }

        setIsLoading(true);
        try {
            // const token = await SecureStore.getItemAsync('spotify_token');
            if (!accessToken) {
                console.error('No Spotify token found');
                return;
            }

            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
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
            console.error('Error searching Spotify:', error);
            Alert.alert('Error', 'Failed to search for songs. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (searchQuery === '') {
            setTracks([]);
            return;
        }
        const timeoutId = setTimeout(() => {
            searchSpotify(searchQuery);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

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

    useEffect(() => {
        const fetchProfile = async () => {
          const profileData = await fetchSpotifyProfile();
          if (profileData) setProfile(profileData);
        };
        fetchProfile();
      }, []);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        setSelectedTrack(null);
        setSendPostVisible(false);
    };

    const setCaption = (text: string) => {
        setCap(text);
    };

    const handleTrackSelect = (track: SpotifyTrack) => {
        setSelectedTrack(track);
        setSendPostVisible(true)
        setSearchQuery('')
    };

    const closeSelectedSong = () => {
        setSelectedTrack(null)
        setSendPostVisible(false)
        setCap('')
    }

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
                setViewIndex(1)
            }
        } catch (error) {
            console.error('Error selecting image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
        }
    };

    const handleNavigation = (direction: 'left' | 'right') => {
        setViewIndex((prev) => (direction === 'right' ? (prev + 1) % 2 : (prev - 1 + 2) % 2));
    };

    // const handleDraftModalClose = (saveDraft: boolean) => {
    //     if (saveDraft) {
    //         console.log('Draft saved');
    //     } else {
    //         resetModalState();
    //     }
    //     setDraftModal(false);
    // };

    return (
        <View style={{ flex: 1 }}>
        <LinearGradient
        colors={['#ffffff', '#d9b3b3']} // White to Maroon
        style={{ flex: 1 }}
        >
        <ScrollView >
            <View style={styles.mainPage}>
            <SpotifyAuth onTokenFetched={handleTokenFetched} />
                {postButtonVisible && (
                    <TouchableOpacity
                        style={styles.postButton}
                        onPress={openModal}
                    >
                            <Ionicons name="add-circle" size={32} color="#A52A2A" />
                    </TouchableOpacity>
                )}
                <Modal
                    animationType='slide'
                    transparent={true}
                    visible={postModalVisible}
                    onRequestClose={closeModal}
                >
                    <View style = {styles.modalContainer}>
                        <View style={styles.postView}>
                            <ThemedText style={styles.postText}>New Post</ThemedText>
                            <Pressable
                                style={[styles.postButton, styles.leavePostButton]}
                                onPress={closeModal}
                            >
                                <Ionicons name="close-circle" size={32} color="#A52A2A" />
                            </Pressable>

                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search for a song..."
                                    value={searchQuery}
                                    onChangeText={handleSearch}
                                    placeholderTextColor="#666"
                                />
                                {isLoading && (
                                    <ActivityIndicator style={styles.loader} />
                                )}
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
                                                {track.artists.map(artist => artist.name).join(', ')}
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
                                    <Text style={styles.selectedTrackName}>{selectedTrack.name}</Text>
                                    <Text style={styles.selectedTrackArtist}>
                                        {selectedTrack.artists.map(artist => artist.name).join(', ')}
                                    </Text>
                                    {selectedTrack.album.images.length > 0 && (
                                        <Image
                                            style={styles.albumCover}
                                            source = {{ uri: selectedTrack.album.images[0].url }}
                                        />
                                    )}
                                </View>
                            )}

                            {sendPostVisible && (
                                <>
                                    {/* <ThemedText style={styles.postText}>Add a Caption</ThemedText> */}
                                    <View style={styles.photoContainer}>
                                        <TouchableOpacity
                                            style = {styles.addPhoto}
                                            onPress = {selectImage}>
                                            <Text style={styles.addPhotoText}>Add a Photo</Text>
                                            {image && (
                                                <Ionicons name="checkmark-circle" size={24} color="white" style={styles.checkmarkIcon} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.captionContainer}>
                                        <TextInput
                                            style={styles.caption}
                                            placeholder="Add a caption..."
                                            placeholderTextColor="#666"
                                            value={caption}
                                            onChangeText={setCaption}
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
                {/* <Modal
                    animationType='slide'
                    transparent={true}
                    visible={draftModal}
                    onRequestClose={() => handleDraftModalClose(false)}
                >
                    <View style={[styles.draftView, { zIndex: 999 }]}>
                        <View style={styles.draftModalContent}>
                            <Text>Do you want to save your post as a draft?</Text>
                            <View style={{ flexDirection: 'row', marginTop: 20, backgroundColor: 'white' }}>
                                <TouchableOpacity
                                    style={[styles.draftButtonNo, { opacity: 1 }]}
                                    onPress={() => handleDraftModalClose(false)}
                                >
                                    <Text style={{ color: 'white' }}>No</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.draftButtonYes, { opacity: 1 }]}
                                    onPress={() => handleDraftModalClose(true)}
                                >
                                    <Text style={{ color: 'white' }}>Yes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal> */}
                <ThemedText style={styles.username}>
                    Hi @{profile?.display_name || "username"}
                </ThemedText>
                <View style={styles.feedContainer}>
                    <ThemedText style={styles.friendsText}>Feed</ThemedText>
                    <View style={styles.feed}>
                        <ScrollView style={styles.feedScroll}>
                        {feed.map((post, index) => (
                        <View key={index} style={styles.post}>
                            <Text style={styles.usernamePost}>{profile?.display_name || "username"}</Text>
                            <View style={styles.postHeader}>
                                <Image 
                                    source={{ uri: post.albumCover }} 
                                    style={styles.albumCoverImage}
                                />
                                <View style={styles.postDetails}>
                                    <Text style={styles.postArtistName}>{post.artistName}</Text>
                                    <Text style={styles.postedTrackName}>{post.track.name}</Text>
                                </View>
                            </View>
                            <Text style={styles.postCaption}>{post.caption}</Text>
                            {post.image && <Image source={{ uri: post.image }} style={styles.postImage} />}
                            <Text style={styles.postTimestamp}>{post.timestamp}</Text>
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
        </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    // mainScroll: {backgroundColor: '#ffffff'},
    mainPage: {
        flex: 1,
        paddingHorizontal: 20,
        // backgroundColor: '#ffffff',
    },
    username: {
        marginTop: 70,
        fontSize: 25,
        color: '#800000',
    },
    postButton: {
        marginTop: 30,
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: 0,
        top: 0,
    },
    postText: {
        color: 'black',
        marginTop: 30,
        fontSize: 25
    },
    selectSong:{
        color: 'black',
        marginTop: 30,
        fontSize: 25
    },
    closeSong: {
        position: 'absolute',
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        right: 0,
        top: 0
    },
    leavePostButton: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: 0,
        top: 0
    },
    searchContainer: {
        width: '90%',
        marginTop: 20,
        position: 'relative',
    },
    searchInput: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        width: '100%',
    },
    loader: {
        position: 'absolute',
        right: 10,
        top: 12,
    },
    trackAlbumCover: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 15,
    },
    albumCover: {
        width: 200,
        height: 200,
        borderRadius: 10,
        marginTop: 10,
        alignSelf: 'center',
    },
    searchResults: {
        width: '90%',
        maxHeight: 300,
        marginTop: 10,
    },
    trackItem: {
        flexDirection: 'row',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    trackDetails: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
    },
    trackName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        width: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    artistName: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
        width: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    selectedTrackContainer: {
        width: '90%',
        padding: 15,
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
        marginTop: 20,
    },
    selectedTrackTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    selectedTrackName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    selectedTrackArtist: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    photoContainer: {
        width: '100%',  // Remove flex: 1
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
    },
    addPhoto: {
        backgroundColor: '#A52A2A',
        marginTop: -10,
        width: 280,
        borderRadius: 8,
        alignItems: 'center',

    },
    addPhotoText: {
        color: 'white',
        fontSize: 20,
    },
    checkmarkIcon: {
        position: 'absolute',
        right: 10, 
        top: 0,
    },
    captionContainer: {
        width: '90%',
        marginTop: 25,
        position: 'relative',
        height: 100,
    },
    caption: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        height: 80,
        width: '100%',
    },
    sendPostButtonContainer: {
        backgroundColor: '#A52A2A',
        borderRadius: 8,
        width: '90%',
        marginTop: 0,
        alignItems: 'center',
    },
    sendPostButton: {
        backgroundColor: '#A52A2A',
        paddingVertical: 12,
        paddingHorizontal: 20,
        width: 250,
        alignItems: 'center',
    },
    sendPostButtonText: {
        color: 'white',
        fontSize: 25,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    draftView: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999, // Ensure highest z-index
    },
    draftModalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '90%',
        maxWidth: 500,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    draftButtonNo: {
        padding: 10,
        marginRight: 5,
        backgroundColor: '#6082B6',
        borderRadius: 5,
        minWidth: 80,
        alignItems: 'center'
    },
    draftButtonYes: {
        padding: 10,
        marginLeft: 5,
        backgroundColor: '#6082B6',
        borderRadius: 5,
        minWidth: 80,
        alignItems: 'center'
    },
    postView: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '90%',
        maxWidth: 500,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    feedScroll: {
        marginBottom: 20,
      },
    post: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    },
    postTrackName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    },
    postCaption: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    },
    postImage: {
    marginTop: 10,
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    },
    postTimestamp: {
    fontSize: 12,
    color: '#999',
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
        color: '#800000',
    },
    friendsScroll: {
        paddingHorizontal: 10
    },
    friendName: {
        fontSize: 18,
        color: '#fff',
        marginHorizontal: 15,
    },
    friendsButton: {
        backgroundColor: '#ffffff',
    },
    friendsButtonText: {
        color: '#ffffff'
    },
    trendingView: {
        marginTop: 30,
        backgroundColor: '#ffffff',
    },
    trendingText: {
        fontSize: 25
    },
    recommendationsView: {
        marginTop: 50,
        backgroundColor: '#ffffff',
    },
    recommendationsText: {
        fontSize: 25
    },
    albumCoverImage: {
        width: 50,
        height: 50,
        borderRadius: 5,
        marginRight: 300,
    },
    usernamePost: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black',
        padding: 10,
        marginTop: -10,
        marginLeft: -10
      },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    postDetails: {
        marginLeft: -290,
    },
    postArtistName: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    postedTrackName: {
        fontSize: 12,
        color: '#555',
        marginRight: 30,
    },
  });