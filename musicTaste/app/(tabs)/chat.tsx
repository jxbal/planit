import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { getDoc, doc } from "firebase/firestore";

const Chat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendList, setFriendList] = useState([]);
  const [currentChatName, setCurrentChatName] = useState([]);
  const [currentChat, setCurrentChat] = useState([]);

  const toggleSlider = () => setIsOpen(!isOpen);


  const handleFriendSelect = async (friend) => {
    let chatRef;
    if (friend.UID.localeCompare(auth.currentUser.uid) > 0) {
        chatRef = doc(db, "chats", `${auth.currentUser.uid + friend.UID}`);
        console.log(auth.currentUser.uid + friend.UID)
      }      
    else{
        chatRef = doc(db, "chats", `${friend.UID + auth.currentUser.uid}`);
        console.log(friend.UID + auth.currentUser.uid)
    }
    const chatSnap = await getDoc(chatRef);
    setCurrentChat(chatSnap.data());
    console.log(currentChat)
    if ('name' in currentChat && currentChat.name != "") {
        setCurrentChatName(currentChat.name);
    }
    else{
        setCurrentChatName(friend.name);
    }
  }

  const displayChat = () => {
    if(currentChat)
  }

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      const fetchedFriends = [];
      if (user) {
        // Reference to the specific user profile by UID
        const userRef = doc(db, "profiles", `${auth.currentUser.uid}`);
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
              UID : friendUID,
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
    <View style={[styles.container, isOpen ? styles.open : null]}>
      <View style={styles.slider}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollView,
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

      <View style={styles.content}>
        <Text style={styles.header}>{currentChatName}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", // Makes the layout horizontal
    flex: 1,
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
  scrollView: {
    flexGrow: 1,
    justifyContent: "flex-start", // This makes sure the content is aligned from the top
    backgroundColor: "#6C98C4",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 16,
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
});

export default Chat;
