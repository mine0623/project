import React from "react";
import { SafeAreaView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Intro() {
    const router = useRouter();
    return (
        <SafeAreaView style={styles.background}>
            <View style={styles.container}>
                <Text style={styles.logo}>mine</Text>
                <Text style={styles.text}>'나의 것' 을 찾는 커뮤니티 소통앱</Text>
                <TouchableOpacity onPress={() => router.replace('/login')}>
                    <Text style={styles.button}>start</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: '#9c7866',
    },
    container: {
        margin: 'auto',
        textAlign: 'center',
        alignItems: 'center'
    },
    logo: {
        color: '#f0f0e5',
        fontSize: 50,
        fontWeight: 'bold',
    },
    text: {
        color: '#f0f0e5',
        fontSize: 20,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#f0f0e5',
        color: '#9c7866',
        fontSize: 25,
        fontWeight: 'bold',
        borderRadius: 50,
        marginTop: 30,
        paddingVertical: 12,
        paddingHorizontal: 25,
    },
}) 