
import { StyleSheet } from 'react-native';

export const GlobalStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    glassEffect: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1,
    },
});
