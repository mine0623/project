import { SafeAreaView, View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import React, { useState } from "react";

export default function Login() {
    const [email, setEmail] = useState("");
    const router = useRouter();
    const [password, setPassword] = useState("");
    
    return (
        <SafeAreaView style={styles.background}>
            <View style={styles.container}>
                <Text style={styles.text}>welcome to mine</Text>
                <View style={styles.inputs}>
                    <TextInput
                        style={styles.input}
                        placeholder="email"
                        clearButtonMode="while-editing"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onChangeText={(text) => {
                            const filtered = text.replace(/[^a-zA-Z0-9@]/g, "");
                            setEmail(filtered);
                        }}
                        value={email}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="password"
                        secureTextEntry={true}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                        onChangeText={(text) => {
                            const filtered = text.replace(/[^a-zA-Z0-9!@#$%^&*]/g, "");
                            setPassword(filtered);
                        }}
                        value={password}
                    />
                </View>
                <TouchableOpacity onPress={() => router.replace('/post')}>
                    <Text style={styles.loginButton}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/signup')}>
                    <Text style={styles.signupButton}>Sign up</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView >
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: '#9c7866'
    },
    container: {
        marginHorizontal: 30,
        marginTop: 100,
        gap: 20,
    },
    text: {
        color: '#f0f0e5',
        fontSize: 30,
        fontWeight: 'bold',
    },
    inputs: {
        gap: 10,
    },
    input: {
        color: '#f0f0e5',
        fontSize: 20,
        borderWidth: 1,
        borderColor: '#f0f0e5',
        padding: 15,
    },
    loginButton: {
        backgroundColor: '#f0f0e5',
        color: '#9c7866',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: 16,
    },
    signupButton: {
        color: '#f0f0e5',
        fontSize: 20,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#f0f0e5',
        textAlign: 'center',
        padding: 15,
    }
})