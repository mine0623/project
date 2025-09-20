import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { 
    SafeAreaView, 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet,
    Keyboard,
    KeyboardAvoidingView,
    TouchableWithoutFeedback
} from "react-native";

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
        <KeyboardAvoidingView
            style={{ flex: 1 }}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <SafeAreaView style={styles.background}>
                    <View style={styles.container}>
                        <Text style={styles.text}>Sign up</Text>
                        <View style={styles.tool}>
                            <Text style={styles.inputText}>email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onChangeText={(text) => setEmail(text)}
                                value={email}
                                clearButtonMode="while-editing"
                            />
                        </View>
                        <View style={styles.tool}>
                            <Text style={styles.inputText}>password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="password"
                                secureTextEntry
                                onChangeText={(text) => setPassword(text)}
                                value={password}
                                clearButtonMode="while-editing"
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Please enter again"
                                secureTextEntry
                                onChangeText={(text) => setPasswordConfirm(text)}
                                value={passwordConfirm}
                                clearButtonMode="while-editing"
                            />
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        </View>
                        <TouchableOpacity onPress={onSignUpPress}>
                            <Text style={styles.button}>sign up</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: '#9c7866'
    },
    container: {
        marginHorizontal: 30,
        marginTop: 50,
        gap: 30,
    },
    text: {
        color: '#f0f0e5',
        fontSize: 30,
        fontWeight: 'bold'
    },
    inputText: {
        color: '#f0f0e5',
        fontSize: 25,
        fontWeight: 'bold',
    },
    input: {
        color: '#f0f0e5',
        fontSize: 20,
        borderWidth: 1,
        borderColor: '#f0f0e5',
        padding: 15,
    },
    tool: {
        gap: 10,
    },
    errorText: {
        color: '#f0f0e5',
    },
    button: {
        backgroundColor: '#f0f0e5',
        color: '#9c7866',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: 16,
    },
})