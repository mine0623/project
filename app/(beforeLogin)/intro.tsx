import React, { useEffect } from "react";
import { SafeAreaView, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Intro() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace("/login");
        }, 3000);
 
        return () => clearTimeout(timer);
    }, []);

    return (
        <SafeAreaView style={styles.background}>
            <View style={styles.container}>
                <Text style={styles.logo}>mine</Text>
                <Text style={styles.text}>나에게 꼭 맞는 옷을 찾는 커뮤니티 소통앱</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: '#9c7866',
    },
    container: {
        margin: 'auto',
        alignItems: 'center',
        gap: 5,
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
});
