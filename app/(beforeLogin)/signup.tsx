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

export default function Signup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const validatePassword = () => {
        if (password.length < 6 || password.length > 10) {
            setError("비밀번호는 6자 이상 10자 이하여야 합니다.");
            return false;
        }
        if (password !== passwordConfirm) {
            setError("비밀번호가 일치하지 않습니다.");
            return false;
        }
        setError("");
        return true;
    };

    const onSignUpPress = async () => {
        if (!validatePassword()) return;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            return;
        }

        const userId = authData.user?.id;
        if (!userId) return;

        await supabase.from("profiles").insert([
            {
                id: userId,
                email: email,
                name: "",
                gender: "",
                age: null,
            },
        ]);

        alert("회원가입 완료! 해당 메일함을 확인해 주세요.");
        router.back();
    };



    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <Text style={styles.title}>Sign up</Text>
                <Text style={styles.text}>email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="이메일을 입력해주세요."
                    placeholderTextColor='#f0f0e580'
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(text) => setEmail(text)}
                    value={email}
                    clearButtonMode="while-editing"
                />
                <Text style={styles.text}>password</Text>
                <TextInput
                    style={styles.input}
                    placeholder="비밀번호를 입력해주세요."
                    placeholderTextColor='#f0f0e580'
                    secureTextEntry
                    onChangeText={(text) => setPassword(text)}
                    value={password}
                    clearButtonMode="while-editing"
                />
                <TextInput
                    style={styles.input}
                    placeholder="다시 입력해주세요."
                    placeholderTextColor='#f0f0e580'
                    secureTextEntry
                    onChangeText={(text) => setPasswordConfirm(text)}
                    value={passwordConfirm}
                    clearButtonMode="while-editing"
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity onPress={onSignUpPress}>
                    <Text style={styles.signupButton}>회원가입</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 40,
        backgroundColor: '#9c7866',
        paddingHorizontal: 30,
        flexDirection: 'column',
        gap: 10,
    },
    title: {
        textAlign: 'center',
        color: '#f0f0e5',
        fontSize: 30,
        fontWeight: 'bold',
        marginVertical: 20,
    },
    text: {
        color: '#f0f0e5',
        fontSize: 25,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    input: {
        color: '#f0f0e5',
        borderColor: '#f0f0e580',
        borderWidth: 1.5,
        borderRadius: 5,
        paddingHorizontal: 12,
        paddingVertical: 15,
        fontSize: 18,
    },
    errorText: {
        color: '#f0f0e5',
    },
    signupButton: {
        color: '#9c7866',
        backgroundColor: '#f0f0e5',
        borderRadius: 5,
        paddingHorizontal: 12,
        paddingVertical: 15,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20
    },
})