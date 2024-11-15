import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const App = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle function to control the sliding bar
  const toggleSlider = () => {
    setIsOpen(!isOpen);
  };

  return (
    <View style={[styles.container, isOpen ? styles.open : null]}>
      {/* Sliding Bar on the Left */}
      <View style={styles.slider}>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleSlider}>
          <Text style={styles.buttonText}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Content Box on the Right */}
      <View style={styles.content}>
        <Text style={styles.header}>Content Box</Text>
        <Text>This is the content box on the right side of the screen.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', // Makes the layout horizontal
    flex: 1,
  },
  slider: {
    width: 60, // Set the width of the sliding bar
    backgroundColor: '#333',
    position: 'absolute', // Positioning it at the left
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  toggleButton: {
    padding: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
  },
  content: {
    flex: 1,
    marginLeft: 60, // Offset the content to the right by the width of the slider
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  open: {
    marginLeft: 200, // Slide out content when the bar is open
  },
});

export default App;
