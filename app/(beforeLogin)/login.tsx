import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
    StyleSheet
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const onLogin = async () => {
        setError("");

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("올바른 이메일 형식이 아닙니다.");
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            if (error.status === 400) {
                setError("아이디나 비밀번호가 일치하지 않습니다.");
            } else {
                setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <Text style={styles.text}>mine</Text>
                <TextInput
                    style={
                        styles.input}
                    placeholder="이메일을 입력해주세요."
                    placeholderTextColor='#f0f0e580'
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    value={email}
                    clearButtonMode="while-editing"
                />
                <TextInput
                    style={styles.input}
                    placeholder="비밀번호를 입력해주세요."
                    placeholderTextColor='#f0f0e580'
                    secureTextEntry
                    onChangeText={setPassword}
                    value={password}
                    clearButtonMode="while-editing"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity onPress={onLogin}>
                    <Text style={styles.loginButton}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/signup")}>
                    <Text style={styles.signupButton}>mine 시작하기</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#9c7866',
        paddingHorizontal: 30,
        flexDirection: 'column',
        paddingTop: 100,
        gap: 10,
    },
    text: {
        color: '#f0f0e5',
        fontSize: 35,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 50,
    },
    input: {
        color: '#f0f0e5',
        borderWidth: 1.5,
        borderRadius: 5,
        borderColor: '#f0f0e580',
        paddingHorizontal: 12,
        paddingVertical: 15,
        fontSize: 18,
    },
    error: {
        color: "#f0f0e580"
    },
    loginButton: {
        color: '#9c7866',
        backgroundColor: '#f0f0e5',
        borderRadius: 5,
        paddingHorizontal: 12,
        paddingVertical: 15,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    signupButton: {
        color: '#f0f0e5',
        borderColor: '#f0f0e5',
        borderWidth: 1.5,
        borderRadius: 5,
        paddingHorizontal: 12,
        paddingVertical: 15,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
})