import { StyleSheet, Image, Platform } from 'react-native';
import { View, Text } from 'react-native';

export default function MainPage() {
    return(
        <View style={styles.mainPage}>
            <Text testID="mainPagetitle">Hi @username</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    mainPage: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
  });
