import { SafeAreaView, View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const [error, setError] = useState("");

    const onLogin = async () => {
        setError("");
        const { data, error } = await supabase.auth.signInWithPassword({
            email, password,
        });

        if (error) {
            setError(error.message);
            return;
        }

        const user = data.user;
        if (!user) return;

        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!profile || !profile.name) {
            router.replace(`/profilesettings?email=${encodeURIComponent(email)}`);
        } else {
            router.replace("/postlist");
        }

    };

    return (
        <SafeAreaView style={styles.background}>
            <View style={styles.container}>
                <Text style={styles.text}>welcome to mine</Text>
                <View style={styles.inputs}>
                    <TextInput
                        style={styles.input}
                        placeholder="email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onChangeText={setEmail}
                        value={email}
                        clearButtonMode="while-editing"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="password"
                        secureTextEntry
                        autoCapitalize="none"
                        onChangeText={setPassword}
                        value={password}
                        clearButtonMode="while-editing"
                    />
                </View>
                {error ? <Text style={{ color: "rgba(240, 240, 229, 0.5)" }}>{error}</Text> : null}
                <TouchableOpacity onPress={onLogin}>
                    <Text style={styles.loginButton}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/signup")}>
                    <Text style={styles.signupButton}>Sign up</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
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