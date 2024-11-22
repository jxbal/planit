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
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { getDoc, doc } from "firebase/firestore";
import { FadeInRight } from "react-native-reanimated";

const Chat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendList, setFriendList] = useState([]);
  const [currentChatName, setCurrentChatName] = useState([]);
  const [currentChatContent, setCurrentChatContent] = useState([]);
  const [currentChatNickName, setCurrentChatNickName] = useState([]);
  const scrollViewRef = useRef(null);
  const toggleSlider = () => setIsOpen(!isOpen);
  const userID = auth.currentUser.uid;

  const handleFriendSelect = async (friend) => {
    let chatRef;
    if (friend.UID.localeCompare(userID) > 0) {
      chatRef = doc(db, "chats", `${userID + friend.UID}`);
    } else {
      chatRef = doc(db, "chats", `${friend.UID + userID}`);
    }
    const chatSnap = await getDoc(chatRef);
    const currentChat = chatSnap.data();
    setCurrentChatNickName(currentChat.nickname);
    setCurrentChatContent(currentChat.content);
    if ("name" in currentChat && currentChat.name != "") {
      setCurrentChatName(currentChat.name);
    } else {
      setCurrentChatName(friend.name);
    }
  };

  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      // Logic to add the message to the current chat
      const newMessage = {
        user: userID, // Replace with the current user's UID
        dialog: inputMessage.trim(),
        timestamp: Date.now(),
      };

      // Add the new message to the chat (pseudo-code, adjust for your DB logic)
      const updatedChatContent = [...currentChatContent, newMessage];
      setCurrentChatContent(updatedChatContent);

      setInputMessage("");
    }
  };

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      const fetchedFriends = [];
      if (user) {
        // Reference to the specific user profile by UID
        const userRef = doc(db, "profiles", `${userID}`);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          for (let i = 0; i < docSnap.data().friend.length; i++) {
            const friendUID = docSnap.data().friend[i]._key.path.segments[6];
            const friendRef = doc(db, "profiles", friendUID);
            const friendSnap = await getDoc(friendRef);
            const imageName = friendSnap.data().img;
            const imgPath = imageName
              ? imageName
              : require("../../assets/images/1.png");
            fetchedFriends.push({
              name: friendSnap.data().username,
              imgPath: imgPath,
              UID: friendUID,
            });
          }
          setFriendList(fetchedFriends);
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
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const screenHeight = Dimensions.get("window").height;
  const firstItemHeight = 80; // Adjust this value based on your item's height

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={[styles.containerRow, isOpen ? styles.open : null]}>
        <View style={styles.slider}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollViewSide,
              {
                paddingTop: (screenHeight - firstItemHeight) / 2 - 80, // This centers the first item
              },
            ]}
          >
            {friendList.map((friend, index) => (
              <View key={index} style={styles.itemContainer}>
                <TouchableOpacity onPress={() => handleFriendSelect(friend)}>
                  <Image source={friend.imgPath} style={styles.itemImage} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.toggleButton} onPress={toggleSlider}>
            <Text style={styles.buttonText}>☰</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.container}>
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
                      <View style={styles.messageBox}>
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
        </View>
      </View>
    </SafeAreaView>
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
  },
  content: {
    flex: 1,
    marginLeft: 60,
    padding: 20,
    backgroundColor: "#f4f4f4",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
  },
  open: {
    marginLeft: 200, // Slide out content when the bar is open
  },
  scrollViewSide: {
    flexGrow: 1,
    justifyContent: "flex-start", // This makes sure the content is aligned from the top
    backgroundColor: "#2d5016ff",
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
    backgroundColor: "#f4f4f4",
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
    backgroundColor: "#fff",
    borderRadius: 5,
    borderColor: "#ccc",
    borderWidth: 1,
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
    backgroundColor: "#007bff",
    borderRadius: 8,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default Chat;
