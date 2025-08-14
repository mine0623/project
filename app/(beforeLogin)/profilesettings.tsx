import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, TextInput, Image, StyleSheet } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from "expo-image-picker";
import { Picker } from '@react-native-picker/picker';
import { supabase } from "@/lib/supabase";


export default function Profilesettings() {
    const [name, setName] = useState("");
    const [selectedGender, setSelectedGender] = useState<string | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [year, setYear] = useState(2000);
    const [month, setMonth] = useState(1);
    const [day, setDay] = useState(1);
    const router = useRouter();
    const { email } = useLocalSearchParams();
    const genders = ["남자", "여자", "공개하지 않음"];


    const years = Array.from({ length: 2025 - 1980 + 1 }, (_, i) => 1980 + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            alert("사진 접근 권한이 필요합니다!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const onFinish = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let avatar_url = null;

        if (imageUri) {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const fileName = `avatars/${user.id}.png`;
            const { data, error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, blob, { upsert: true });

            if (uploadError) {
                console.error(uploadError);
            } else {
                avatar_url = `${supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl}`;
            }
        }

        const { error } = await supabase.from("profiles").insert([
            {
                id: user.id,
                email,
                name,
                gender: selectedGender,
                avatar_url,
            }
        ]);

        if (error) {
            console.error(error);
            return;
        }

        router.replace("/post");
    };


    return (
        <SafeAreaView style={styles.background}>
            <View style={styles.container}>
                <Text style={styles.text}>Profile Settings</Text>
                <TouchableOpacity style={styles.profileImg} onPress={pickImage}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.profileImg} />
                    ) : (
                        <Ionicons name="person-circle-sharp" size={150} color="#b7aa93" />
                    )}
                </TouchableOpacity>

                <View style={styles.frame}>
                    <Text style={styles.title}>name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="name"
                        onChangeText={(text) => {
                            if (text.length <= 10) setName(text);
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
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={year}
                            style={styles.year}
                            onValueChange={(itemValue) => setYear(itemValue)}
                        >
                            {years.map(y => <Picker.Item key={y} label={`${y}`} value={y} />)}
                        </Picker>

                        <Picker
                            selectedValue={month}
                            style={styles.month}
                            onValueChange={(itemValue) => setMonth(itemValue)}
                        >
                            {months.map(m => <Picker.Item key={m} label={`${m}`} value={m} />)}
                        </Picker>

                        <Picker
                            selectedValue={day}
                            style={styles.day}
                            onValueChange={(itemValue) => setDay(itemValue)}
                        >
                            {days.map(d => <Picker.Item key={d} label={`${d}`} value={d} />)}
                        </Picker>
                    </View>
                </View>
                <TouchableOpacity onPress={onFinish}>
                    <Text style={styles.button}>finish</Text>
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
        width: 150,
        height: 150,
        borderRadius: '100%',
        overflow: "hidden",
        alignSelf: "center"
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
    pickerContainer: {
        flexDirection: "row",
        height: 150,
    },
    year: {
        flex: 2,
    },
    month: {
        flex: 1,
    },
    day: {
        flex: 1,
    },
    button: {
        marginTop: 10,
        backgroundColor: '#f0f0e5',
        color: '#9c7866',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: 18,
    },
})