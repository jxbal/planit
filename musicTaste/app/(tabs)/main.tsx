import { StyleSheet, ScrollView, Dimensions, TouchableOpacity, TextInput, ActivityIndicator} from 'react-native';
import { Text, Modal, Alert, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import SpotifyAuth from "../../spotifySongSearch";

const friendsList = ["owen", "johnson", "kelly", "juan", "joanna", "friend", "friend", "friend"];
//when we have friends list from database, we can fill this list dynamically

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
    
    const [accessToken, setAccessToken] = useState(null);

    const handleTokenFetched = (token) => {
        if (!accessToken) {
            setAccessToken(token);
          }
      };

    const handleContentSizeChange = (width: number) => {
        setButtonVisible(width > windowWidth);
    }

    const openModal = () => {
        Alert.alert('Floating Button pressed');
        setPostModalVisible(true);
        setPostButtonVisible(false);
    }

    const closeModal = () => {
        setPostModalVisible(false);
        setPostButtonVisible(true);
    }

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
        const timeoutId = setTimeout(() => {
            searchSpotify(searchQuery);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    const handleTrackSelect = (track: SpotifyTrack) => {
        setSelectedTrack(track);
    };

    return (
        <ScrollView style={styles.mainScroll}>
            <ThemedView style={styles.mainPage}>
            <SpotifyAuth onTokenFetched={handleTokenFetched} />
                {postButtonVisible && (
                    <TouchableOpacity
                        style={styles.postButton}
                        onPress={openModal}
                    >
                        <Ionicons name="add-circle" size={32} color="white" />
                    </TouchableOpacity>
                )}
                <Modal
                    animationType='slide'
                    transparent={true}
                    visible={postModalVisible}
                    onRequestClose={closeModal}
                >
                    <ThemedView style={styles.postView}>
                        <ThemedText style={styles.postText}>New Post</ThemedText>
                        <Pressable
                            style={[styles.postButton, styles.leavePostButton]}
                            onPress={closeModal}
                        >
                            <Ionicons name="close-circle" size={32} color="black" />
                        </Pressable>

                        <ThemedView style={styles.searchContainer}>
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
                        </ThemedView>

                        <ScrollView style={styles.searchResults}>
                            {tracks.map((track) => (
                                <TouchableOpacity
                                    key={track.id}
                                    style={styles.trackItem}
                                    onPress={() => handleTrackSelect(track)}
                                >
                                    <Text style={styles.trackName}>{track.name}</Text>
                                    <Text style={styles.artistName}>
                                        {track.artists.map(artist => artist.name).join(', ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {selectedTrack && (
                            <ThemedView style={styles.selectedTrackContainer}>
                                <Text style={styles.selectedTrackTitle}>Selected Song:</Text>
                                <Text style={styles.selectedTrackName}>{selectedTrack.name}</Text>
                                <Text style={styles.selectedTrackArtist}>
                                    {selectedTrack.artists.map(artist => artist.name).join(', ')}
                                </Text>
                            </ThemedView>
                        )}
                    </ThemedView>
                </Modal>
                <ThemedText style={styles.username}>Hi @username</ThemedText>
                <ThemedView style={styles.friendsView}>
                    <ThemedText style={styles.friendsText}>Friends</ThemedText>
                    <ScrollView
                        horizontal
                        contentContainerStyle={styles.friendsScroll}
                        onContentSizeChange={(width) => handleContentSizeChange(width)}
                    >
                        {friendsList.map((friend, index) => (
                            <ThemedText key={index} style={styles.friendName}>{friend}</ThemedText>
                        ))}
                        {buttonVisible && (
                            <TouchableOpacity style={styles.friendsButton}> 
                                <Text style={styles.friendsButtonText}>Click Me</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </ThemedView>
                <ThemedView style={styles.trendingView}>
                    <ThemedText style={styles.trendingText}>Trending</ThemedText>
                </ThemedView>
                <ThemedView style={styles.recommendationsView}>
                    <ThemedText style={styles.recommendationsText}>Recommendations</ThemedText>
                </ThemedView>
            </ThemedView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    mainScroll: {backgroundColor: '#6082B6'},
    mainPage: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: '#6082B6',
    },
    username: {
        marginTop: 100,
        fontSize: 25,
    },
    postButton: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: 0,
        top: 0
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
    searchResults: {
        width: '90%',
        maxHeight: 300,
        marginTop: 10,
    },
    trackItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    trackName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    artistName: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
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
    postView: {
        margin: 50,
        backgroundColor: 'white',
        borderRadius: 20,
        height: 600,
        // padding: 200,
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
    friendsView: {
        marginTop: 50,
        backgroundColor: '#6082B6',
    },
    friendsText: {
        fontSize: 25
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
        backgroundColor: '#6082B6',
    },
    trendingText: {
        fontSize: 25
    },
    recommendationsView: {
        marginTop: 50,
        backgroundColor: '#6082B6',
    },
    recommendationsText: {
        fontSize: 25
    },
  });

