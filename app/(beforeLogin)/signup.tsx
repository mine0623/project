import { useRouter } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";

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
        setError("");
        return true;
    };

    const onSignUpPress = () => {
        if (validatePassword()) {
            router.replace('/profilesettings')
        }
    };

    return (
        <SafeAreaView style={styles.background}>
            <View style={styles.container}>
                <Text style={styles.text}>sign up</Text>
                <View>
                    <Text style={styles.inputText}>email</Text>
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
                </View>
                <View>
                    <Text style={styles.inputText}>password</Text>
                    <View style={styles.password}>
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
                        <TextInput
                            style={styles.input}
                            placeholder="Please enter again"
                            secureTextEntry={true}
                            clearButtonMode="while-editing"
                            autoCapitalize="none"
                            onChangeText={(text) => {
                                const filtered = text.replace(/[^a-zA-Z0-9!@#$%^&*]/g, "");
                                setPasswordConfirm(filtered);
                            }}
                            value={passwordConfirm}
                        />

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    </View>
                </View>
                <TouchableOpacity onPress={onSignUpPress}>
                    <Text style={styles.button}>Sign up</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: '#9c7866'
    },
    container: {
        marginHorizontal: 30,
        marginTop: 50,
        gap: 20,
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
        marginBottom: 10,
    },
    input: {
        color: '#f0f0e5',
        fontSize: 20,
        borderWidth: 1,
        borderColor: '#f0f0e5',
        padding: 15,
    },
    password: {
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