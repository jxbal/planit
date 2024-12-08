import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
} from "react-native";
import { Calendar } from "lucide-react-native";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

const db = getFirestore();

interface Post {
  date: string;
  timestamp: string;
  albumCover: string;
  artistName: string;
  caption: string;
  image: string;
  name: string;
  track: { name: string };
}

interface UserDocument {
  archivedPosts: {
    [key: number]: Post;
  };
}

const CalendarPicker = ({ userId }: { userId: string }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dayModal, setDayModal] = useState(false);
  const [previouslyPostedDates, setPreviouslyPostedDates] = useState<string[]>(
    []
  );
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [archivedPosts, setArchivedPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPreviouslyPostedDates = async () => {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as UserDocument;
          const datesWithImages = Object.values(data.archivedPosts);
          setArchivedPosts(datesWithImages);
          setPreviouslyPostedDates(datesWithImages.map((item) => item.date));
        } else {
          console.log("No document exists");
        }
      } catch (error) {
        console.error("Error fetching timestamps:", error);
      }
    };

    fetchPreviouslyPostedDates();
  }, [userId]);

  const handleDateClick = (day: number): void => {
    const clickedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );

    const formattedClickedDate = clickedDate.toLocaleDateString("en-US");
    setSelectedDate(clickedDate);

    const matchingPost = archivedPosts.find(
      (post) => post.date === formattedClickedDate
    );

    if (matchingPost) {
      setSelectedPost(matchingPost);
      setDayModal(true);
    } else {
      setSelectedPost(null);
      setDayModal(false);
    }
  };

  const closeDayModal = () => {
    setDayModal(false);
  };

  const daysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number): boolean => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.setMonth(currentMonth.getMonth() + 1))
    );
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.setMonth(currentMonth.getMonth() - 1))
    );
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dayString = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      ).toLocaleDateString("en-US");

      const isPreviouslyPosted = previouslyPostedDates.includes(dayString);
      days.push(
        <TouchableOpacity
          key={day}
          onPress={() => handleDateClick(day)}
          style={[
            styles.day,
            isToday(day) && !isSelected(day) && styles.today,
            isSelected(day) && styles.selectedDay,
            isPreviouslyPosted && styles.previouslyPostedDay,
          ]}
        >
          <Text
            style={[
              styles.dayText,
              isSelected(day) && styles.selectedDayText,
              isPreviouslyPosted && styles.previouslyPostedDayText,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>&lt;</Text>
        </TouchableOpacity>
        <View style={styles.monthDisplay}>
          <Calendar width={20} height={20} />
          <Text style={styles.monthText}>{formatDate(currentMonth)}</Text>
        </View>
        <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>&gt;</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.weekDays}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <Text key={day} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.daysContainer}>{renderCalendarDays()}</View>
      <Text style={styles.selectedText}>
        Selected: {selectedDate.toLocaleDateString()}
      </Text>
      {dayModal && selectedPost && (
        <Modal
          animationType="slide"
          visible={dayModal}
          transparent={true}
          onRequestClose={closeDayModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderText}>
                  Post from {selectedDate.toLocaleDateString()}
                </Text>
                <TouchableOpacity
                  style={styles.closeModal}
                  onPress={closeDayModal}
                >
                  <Ionicons name="close-circle" size={32} color="#A52A2A" />
                </TouchableOpacity>
              </View>
              <View>
                <Text style={styles.username}>{selectedPost?.name}</Text>
              </View>
              <View style={styles.songContainer}>
                <Image
                  source={{ uri: selectedPost?.albumCover }}
                  style={styles.albumImage}
                />
                <View style={styles.postDeatils}>
                  <Text style={styles.artistName}>
                    {selectedPost?.artistName}
                  </Text>
                  <Text style={styles.trackName}>
                    {selectedPost.track.name}
                  </Text>
                </View>
              </View>
              <Text style={styles.postCaption}>{selectedPost?.caption}</Text>
              <View style={styles.postImageContent}>
                <Image
                  source={{ uri: selectedPost?.image }}
                  style={styles.postImage}
                ></Image>
              </View>
              <Text style={styles.timestamp}>{selectedPost?.timestamp}</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default CalendarPicker;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
  },
  navButtonText: {
    fontSize: 16,
    color: "#333",
  },
  monthDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekDay: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  day: {
    width: 32,
    height: 32,
    margin: 4,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  today: {
    borderWidth: 1,
    borderColor: "#A52A2A",
  },
  previouslyPostedDay: {
    backgroundColor: "#A52A2A",
  },
  previouslyPostedDayText: {
    color: "white",
  },
  selectedDay: {
    backgroundColor: "#000",
  },
  dayText: {
    color: "#333",
  },
  selectedDayText: {
    color: "#fff",
  },
  selectedText: {
    marginTop: 16,
    textAlign: "center",
    color: "#666",
  },
  emptyDay: {
    width: 32,
    height: 32,
    margin: 4,
  },
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
  modalContent: {
    justifyContent: "center",
    alignContent: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxWidth: 400,
    height: "70%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -75,
    marginLeft: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  closeModal: {
    marginRight: 10,
  },
  modalHeaderText: {
    fontSize: 17,
  },
  username: {
    marginTop: 10,
    marginLeft: 10,
    fontWeight: "bold",
    fontSize: 18,
  },
  songContainer: { flexDirection: "row", marginLeft: 10, marginTop: 10 },
  albumImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
  },
  postDeatils: {
    flexDirection: "column",
    justifyContent: "center",
    marginLeft: 10,
  },
  artistName: { fontWeight: "bold" },
  trackName: {},
  postCaption: { marginLeft: 10, marginTop: 10 },
  postImageContent: {
    borderLeftWidth: 10,
    borderLeftColor: "white",
    borderRightColor: "white",
    borderRightWidth: 10,
  },
  postImage: {
    marginTop: 10,
    width: "100%",
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  timestamp: { marginLeft: 10, marginTop: 10 },
});
