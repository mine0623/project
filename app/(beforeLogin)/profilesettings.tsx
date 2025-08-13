import { useRouter } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Profilesettings() {
    const [name, setName] = useState("");
    const [selectedGender, setSelectedGender] = useState<string | null>(null);
    const router = useRouter();

    const genders = ["남자", "여자", "공개하지 않음"];
    return (
        <SafeAreaView style={styles.background}>
            <View style={styles.container}>
                <Text style={styles.text}>Profile Settings</Text>
                <TouchableOpacity style={styles.profileImg}>
                    <Ionicons name="person-circle-sharp" size={150} color="#f0f0e5" />
                </TouchableOpacity>
                <View style={styles.frame}>
                    <Text style={styles.title}>name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="name"
                        onChangeText={(text) => {
                            if (text.length <= 10) {
                                setName(text);
                            }
                        }}
                        value={name}
                    />
                </View>
                <View style={styles.frame}>
                    <Text style={styles.title}>gender</Text>
                    <View style={styles.genders}>
                        {genders.map((gender) => (
                            <TouchableOpacity
                                key={gender}
                                style={[
                                    styles.genderButton,
                                    selectedGender === gender && styles.selectedBackground,
                                ]}
                                onPress={() => setSelectedGender(gender)}
                            >
                                <Text
                                    style={[
                                        styles.genderText,
                                        selectedGender === gender && styles.selectedTextColor,
                                    ]}
                                >
                                    {gender}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={styles.frame}>
                    <Text style={styles.title}>age</Text>
                    {/* 년 월 일 */}
                </View>
                <TouchableOpacity onPress={() => router.replace('/post')}>
                    <Text style={styles.button}>finish</Text>
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
        marginHorizontal: 25,
        marginTop: 50,
        gap: 20,
    },
    text: {
        color: '#f0f0e5',
        fontSize: 30,
        fontWeight: 'bold',
    },
    title: {
        color: '#f0f0e5',
        fontSize: 25,
        fontWeight: 'bold',
    },
    frame: {
        gap: 10,
    },
    profileImg: {
        margin: 'auto'
    },
    input: {
        color: '#f0f0e5',
        fontSize: 20,
        borderWidth: 1,
        borderColor: '#f0f0e5',
        padding: 15,
    },
    genders: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    genderButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f0f0e5',

    },
    selectedBackground: {
        backgroundColor: "#f0f0e5",
    },
    genderText: {
        color: '#f0f0e5',
        fontSize: 18,
    },
    selectedTextColor: {
        color: "#9c7866",
    },
    button: {
        backgroundColor: '#f0f0e5',
        color: '#9c7866',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: 18,
    },
})