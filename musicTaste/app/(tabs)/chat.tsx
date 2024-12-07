import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
  SafeAreaView,
  Modal,
} from "react-native";
import axios from "axios";
import { db, auth } from "../../firebaseConfig";
import { getDoc, doc, updateDoc } from "firebase/firestore";
import { FadeInRight } from "react-native-reanimated";
import AntDesign from "@expo/vector-icons/AntDesign";
import * as SecureStore from "expo-secure-store";

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

const Chat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  //   const [friendList, setFriendList] = useState([]);
  //   const [chatRef, setChatRef] = useState([]);
  const [currentChatName, setCurrentChatName] = useState([]);
  const [currentChatContent, setCurrentChatContent] = useState([]);
  const [currentChatNickName, setCurrentChatNickName] = useState([]);
  const [chatList, setChatList] = useState([]);
  const scrollViewRef = useRef(null);
  const toggleSlider = () => setIsOpen(!isOpen);
  const [profile, setProfile] = useState<any>(null);
  //   const userID = profile.id;
  const [userID, setUserID] = useState("");
  //   const userID = auth.currentUser.uid;
  let chatRef;
//   const [chatRef, setChatRef] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  let isDM = false; // either direct message or group chat
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleChatSelect = async (chat) => {
    chatRef = doc(db, "chats", chat.UID);
    // setChatRef(doc(db, "chats", chat.UID));
    const chatSnap = await getDoc(chatRef);
    const currentChat = chatSnap.data();
    setCurrentChatNickName(currentChat.nickname);
    setCurrentChatContent(currentChat.content);
    // if ("name" in currentChat && currentChat.name != "") {
    setCurrentChatName(currentChat.name);
    // }
  };

  const [inputMessage, setInputMessage] = useState("");

  useEffect(() => {
    const initializeProfile = async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return;

      try {
        const response = await axios.get("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setProfile(response.data.id);
        setUserID(response.data.id);
      } catch (error) {
        console.error("Error fetching Spotify profile:", error);
      }
    };

    initializeProfile();
  }, []);

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      const newMessage = {
        user: userID,
        dialog: inputMessage.trim(),
        // reply: [],  // Ensure reply is always an object
        // time: Date.now(),  // Use timestamp or Date object
      };

      const updatedChatContent = [...currentChatContent, newMessage];
      setCurrentChatContent(updatedChatContent);

      console.log("Updated chat content:", updatedChatContent);

      try {
        await updateDoc(chatRef, {
          content: updatedChatContent, // Make sure content is always updated correctly
        });
        console.log("Message sent!");
      } catch (error) {
        console.error("Error sending message:", error);
      }

      setInputMessage("");
    }
  };

  const handleAddChat = () => {
    setIsModalOpen(true);
  };

  const fetchUserData = async () => {
    try {
      if (userID) {
        // Reference to the specific user profile by UID
        const userRef = doc(db, "profiles", `${userID}`);
        const docSnap = await getDoc(userRef);
        const chatInfos = [];
        if (docSnap.exists()) {
          for (let i = 0; i < docSnap.data().chatGroup.length; i++) {
            const chatUID = docSnap.data().chatGroup[i];
            const chatSnap = await getDoc(doc(db, "chats", chatUID));
            const imageName = chatSnap.data().groupImg;
            // console.log(chatSnap.data())
            const imgPath = imageName
              ? imageName
              : require("../../assets/images/3cherry.png");
            chatInfos.push({
              name: chatSnap.data().name,
              imgPath: imgPath,
              UID: chatUID,
            });
          }
          setChatList(chatInfos);
          //   for (let i = 0; i < docSnap.data().friend.length; i++) {
          //     const friendUID = docSnap.data().friend[i]._key.path.segments[6];
          //     const friendRef = doc(db, "profiles", friendUID);
          //     const friendSnap = await getDoc(friendRef);
          //     const imageName = friendSnap.data().img;
          //     const imgPath = imageName
          //       ? imageName
          //       : require("../../assets/images/1.png");
          //     fetchedFriends.push({
          //       name: friendSnap.data().username,
          //       imgPath: imgPath,
          //       UID: friendUID,
          //     });
          //   }
          //   setFriendList(fetchedFriends);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userID]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const handleCreate = () => {
    setIsModalOpen(false); 
    setIsCreateModalOpen(true);
  };

  const handleJoin = () => {
    console.log("Join Chat");
    setIsModalOpen(false);
  };

  const screenHeight = Dimensions.get("window").height;
  const firstItemHeight = 80; // Adjust this value based on your item's height

  return (
    <View style={styles.containerRow}>
      <View style={[styles.slider, isOpen ? styles.open : null]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollViewSide,
            {
              paddingTop: (screenHeight - firstItemHeight) / 2 - 80, // This centers the first item
            },
          ]}
        >
          <View key="addChat" style={styles.itemContainer}>
            <TouchableOpacity onPress={() => handleAddChat()}>
              <AntDesign name="pluscircleo" size={50} color="white" />
              {isOpen && <Text style={styles.usernameText}>Add Chat</Text>}
            </TouchableOpacity>
          </View>
          {chatList.map((chat, index) => (
            <View key={index} style={styles.itemContainer}>
              <TouchableOpacity onPress={() => handleChatSelect(chat)}>
                <Image source={chat.imgPath} style={styles.itemImage} />
                {isOpen && <Text style={styles.usernameText}>{chat.name}</Text>}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleSlider}>
          <Text style={styles.buttonText}>☰</Text>
          {/* {!isOpen && <Text style={styles.buttonText}>☰</Text>} */}
          {/* {isOpen && <Text style={styles.buttonOpenText}>☰</Text>} */}
        </TouchableOpacity>
      </View>
      <View style={[styles.container, isOpen ? styles.containerOpen : null]}>
        <Text style={styles.header}>{currentChatName}</Text>
        {/* Chat Messages */}
        <ScrollView
          contentContainerStyle={styles.scrollView}
          ref={scrollViewRef}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {currentChatContent &&
            currentChatContent
              .slice()
              //   .reverse()
              .map((dialogInfo, index) => {
                const isUserMessage = dialogInfo.user === userID;
                return (
                  <View key={index} style={styles.messageContainer}>
                    <View
                      style={[styles.row, isUserMessage && styles.rightRow]}
                    >
                      <Image
                        source={require("../../assets/images/1.png")}
                        style={styles.itemImage}
                      />
                      <Text style={styles.usernameText}>
                        {currentChatNickName[dialogInfo.user]}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.messageBox,
                        isUserMessage && styles.userMessageBox,
                      ]}
                    >
                      <Text style={styles.messageText}>
                        {dialogInfo.dialog}
                      </Text>
                    </View>
                  </View>
                );
              })}
        </ScrollView>

        {/* Input Box */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            value={inputMessage}
            onChangeText={setInputMessage}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View><Modal
  transparent={true}
  visible={isModalOpen}
  animationType="fade"
  onRequestClose={() => setIsModalOpen(false)} // Close modal on Android back press
>
  <TouchableOpacity
    style={styles.modalOverlay} 
    onPress={() => setIsModalOpen(false)} // Close modal when clicking outside the modal
    activeOpacity={1} // Ensure background doesn't change opacity
  >
    <View
      style={styles.modalContainer}
      onStartShouldSetResponder={(e) => e.target === e.currentTarget} // Prevent closing when clicking inside modal
    >
      <TouchableOpacity
        style={styles.modalButton}
        onPress={handleCreate}
      >
        <Text style={styles.modalButtonText}>Create</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modalButton}
        onPress={handleJoin}
      >
        <Text style={styles.modalButtonText}>Join</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
</Modal>
<Modal
  transparent={true}
  visible={isCreateModalOpen}
  animationType="fade"
  onRequestClose={() => setIsCreateModalOpen(false)} // Close modal on Android back press
>
  <TouchableOpacity
    style={styles.modalOverlay} 
    onPress={() => setIsCreateModalOpen(false)} // Close modal when clicking outside the modal
    activeOpacity={1} // Ensure background doesn't change opacity
  >
    <View
      style={styles.modalContainer}
      onStartShouldSetResponder={(e) => e.target === e.currentTarget} // Prevent closing when clicking inside modal
    >
      <Text style={styles.modalTitle}>Create New Group Chat</Text>

      {/* Group Name Input */}
      <TextInput
        style={styles.inputCreate}
        placeholder="Enter Group Name"
        value={groupName}
        onChangeText={setGroupName}
      />

      {/* Search Bar */}
      <Text style={styles.modelSecondTitle}>Invite User</Text>
      <TextInput
        style={styles.inputCreate}
        placeholder="Search Users"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Buttons */}
      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => {
          // Handle creating the group chat with the group name and search query
          console.log('Creating group:', groupName, 'with search:', searchQuery);
          setIsCreateModalOpen(false); // Close the second modal after creating
        }}
      >
        <Text style={styles.modalButtonText}>Create Group</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
</Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  containerRow: {
    flexDirection: "row",
    flex: 1,
  },
  container: {
    flex: 1,
    width: "82%",
    marginLeft: "18%",
    backgroundColor: "#ffecda",
  },
  slider: {
    width: "18%", // Set the width of the sliding bar
    backgroundColor: "#333",
    position: "absolute", // Positioning it at the left
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  toggleButton: {
    padding: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 24,
    alignItems: "center",
  },
  //   buttonOpenText:{
  //     color: "white",
  //     fontSize: 24,
  //     width: "50%",
  //     alignItems:"center",
  //     marginLeft: auto,
  //   },
  content: {
    flex: 1,
    marginLeft: 60,
    padding: 20,
    backgroundColor: "#f4f4f4",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 10,
    backgroundColor: "#ffd3b6",
  },
  open: {
    width: "35%",
    alignItems: "left",
    // marginLeft: 200, // Slide out content when the bar is open
  },
  scrollViewSide: {
    flexGrow: 1,
    justifyContent: "flex-start", // This makes sure the content is aligned from the top
    backgroundColor: "#ff847c",
  },
  scrollView: {
    // width: "82%",
    // borderTopWidth: 10,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  //   messageText: {
  //     backgroundColor: "#e1e1e1",
  //     padding: 10,
  //     borderRadius: 10,
  //     marginVertical: 5,
  //     alignSelf: "flex-start", // Align messages to the left by default
  //   },
  row: {
    // paddingTop: 15,
    flexDirection: "row",
  },
  messageContainer: {
    marginVertical: 8,
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  usernameText: {
    fontSize: 17,
    paddingTop: 15,
    fontWeight: "bold",
    color: "#333",
  },
  rightRow: {
    flexDirection: "row-reverse",
  },
  messageBox: {
    padding: 10,
    borderRadius: 5,
    borderColor: "#ccc",
    borderWidth: 1,
    backgroundColor: "#bbded6",
  },
  messageText: {
    fontSize: 14,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f9f9f9",
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  sendButton: {
    marginLeft: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#e23e57",
    borderRadius: 8,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  userNameSideBar: {
    fontSize: 18,
  },
  userMessageBox: {
    backgroundColor: "#f9ffea",
  },
  containerOpen: {
    marginLeft: "35%",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 300,
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 20,
  },
  modalButton: {
    padding: 18,
    backgroundColor: '#e23e57',
    borderRadius: 5,
    marginBottom: 20,
    height: 60,
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ff0000',
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  inputCreate:{
    width: '100%',
    height: 60,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
    borderRadius: 5,
  },
  modelSecondTitle:{
    height: 50,
    fontSize:20,
    padding: 10,
  },
});

export default Chat;
