import { StyleSheet, ScrollView, Dimensions, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
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
    
    const [accessToken, setAccessToken] = useState<string | null>(null);

    interface TokenFetchedHandler {
        (token: string): void;
    }

    const handleTokenFetched: TokenFetchedHandler = (token) => {
        if (!accessToken) {
            setAccessToken(token);
        }
    };
    const [sendPostVisible, setSendPostVisible] = useState(false);
    const [caption, setCap] = useState('')


    const handleContentSizeChange = (width: number) => {
        setButtonVisible(width > windowWidth);
    }

    const openModal = () => {
        // Alert.alert('Floating Button pressed');
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
        if (searchQuery === '') {
            setTracks([]);
            return;
        }
        const timeoutId = setTimeout(() => {
            searchSpotify(searchQuery);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

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
                    <ThemedView style = {styles.modalContainer}>
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
                                        {track.album.images.length > 0 && (
                                            <Image
                                                style={styles.trackAlbumCover}
                                                source={{ uri: track.album.images[0].url }}
                                            />
                                        )}
                                        <ThemedView style={styles.trackDetails}>
                                            <Text style={styles.trackName}>{track.name}</Text>
                                            <Text style={styles.artistName}>
                                                {track.artists.map(artist => artist.name).join(', ')}
                                            </Text>
                                        </ThemedView>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {selectedTrack && (
                                <ThemedView style={styles.selectedTrackContainer}>
                                <TouchableOpacity
                                    style={styles.closeSong}
                                    onPress={closeSelectedSong}
                                >
                                <Ionicons name="close-circle" size={32} color="black" />
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
                                </ThemedView>
                            )}

                            {sendPostVisible && (
                                <>
                                    {/* <ThemedText style={styles.postText}>Add a Caption</ThemedText> */}
                                    <ThemedView style={styles.captionContainer}>
                                        <TextInput
                                            style={styles.caption}
                                            placeholder="Add a caption..."
                                            placeholderTextColor="#666"
                                            value={caption} 
                                            onChangeText={setCaption}
                                        />
                                    </ThemedView>
                                    <ThemedView style={styles.sendPostButtonContainer}>
                                        <TouchableOpacity
                                            style={styles.sendPostButton}
                                            // onPress={sendPost}
                                        >
                                            <Text style={styles.sendPostButtonText}>Post Now</Text>
                                        </TouchableOpacity>
                                    </ThemedView>
                                </>
                            )}
                        </ThemedView>
                    </ThemedView>
                </Modal>
                <ThemedText style={styles.username}>Hi @username</ThemedText>
                <ThemedView style={styles.friendsView}>
                    <ThemedText style={styles.friendsText}>Feed</ThemedText>
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
        marginTop: 90,
        fontSize: 25,
    },
    postButton: {
        marginTop: 30,
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
    captionContainer: {
        width: '90%',
        marginTop: 30,
        position: 'relative',
        height: 100,
    },
    caption: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        height: 100,
        width: '100%',
    },
    sendPostButtonContainer: {
        backgroundColor: '#6082B6',
        borderRadius: 8,
        width: '90%',
        marginTop: 30,
        alignItems: 'center',
    },
    sendPostButton: {
        backgroundColor: '#6082B6',
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