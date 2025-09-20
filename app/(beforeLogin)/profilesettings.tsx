import { useRouter } from "expo-router";
import React, { useMemo, useState, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Image,
    StyleSheet,
    Keyboard,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { decode as decodeBase64 } from "base64-arraybuffer";

export default function Profilesettings() {
    const [name, setName] = useState("");
    const [selectedGender, setSelectedGender] = useState<string | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [year, setYear] = useState(2000);
    const [month, setMonth] = useState(1);
    const [day, setDay] = useState(1);
    const [isExistingProfile, setIsExistingProfile] = useState(false);
    const router = useRouter();
    const genders = ["남자", "여자"];

    const years = useMemo(() => Array.from({ length: 2025 - 1980 + 1 }, (_, i) => 1980 + i), []);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    const days = useMemo(() => Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1), [year, month]);

    useEffect(() => {
        loadExistingProfile();
    }, []);

    const loadExistingProfile = async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!error && data) {
            setIsExistingProfile(true);
            setName(data.name ?? "");
            setSelectedGender(data.gender ?? null);
            setYear(data.birth_year ?? 2000);
            setMonth(data.birth_month ?? 1);
            setDay(data.birth_day ?? 1);
            setImageUri(data.avatar_url ?? null);
        }
    };

    const mimeFromUri = (uri?: string | null) => {
        if (!uri) return "application/octet-stream";
        const ext = uri.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "jpg": case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "webp": return "image/webp";
            case "heic": return "image/heic";
            default: return "image/*";
        }
    };
    const extFromMime = (mime: string) => {
        if (mime.includes("jpeg")) return "jpg";
        if (mime.includes("png")) return "png";
        if (mime.includes("webp")) return "webp";
        if (mime.includes("heic")) return "heic";
        return "bin";
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("권한 필요", "사진 접근 권한이 필요합니다!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
            base64: true,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            setImageUri(asset.uri);
            setImageBase64(asset.base64 ?? null);
        }
    };

    const getArrayBufferForUpload = async (uri: string, fallbackBase64?: string | null) => {
        try {
            const res = await fetch(uri);
            const ab = res.arrayBuffer ? await res.arrayBuffer() : await (await res.blob()).arrayBuffer();
            if (ab && ab.byteLength > 0) return ab;
        } catch (e) { console.warn("fetch->arrayBuffer failed:", e); }

        if (fallbackBase64) {
            try { return decodeBase64(fallbackBase64); }
            catch (e) { console.warn("picker base64 decode failed:", e); }
        }

        try {
            const fsB64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            return decodeBase64(fsB64);
        } catch (e) { console.warn("fs base64 decode failed:", e); }

        throw new Error("이미지 바이트를 확보하지 못했습니다.");
    };

    const onFinish = async () => {
        if (!name.trim()) return Alert.alert("확인", "이름을 입력해주세요.");

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return Alert.alert("로그인 필요", "로그인이 필요합니다.");

        const userEmail = user.email ?? "";

        let publicUrl: string | null = imageUri ?? null;

        if (imageUri?.startsWith("file://")) {
            const mime = mimeFromUri(imageUri);
            const ext = extFromMime(mime);
            const fileName = `${user.id}.${ext}`;

            try {
                const arrayBuffer = await getArrayBufferForUpload(imageUri, imageBase64);
                const { error: uploadError } = await supabase.storage
                    .from("avatars")
                    .upload(fileName, arrayBuffer, { contentType: mime, upsert: true });

                if (uploadError) return Alert.alert("업로드 실패", uploadError.message);

                const { data: pub } = supabase.storage.from("avatars").getPublicUrl(fileName);
                publicUrl = pub?.publicUrl ?? null;
            } catch (e: any) {
                return Alert.alert("오류", e?.message ?? "이미지 업로드 중 문제가 발생했습니다.");
            }
        }

        const { error: upsertError } = await supabase.from("profiles").upsert([{
            id: user.id,
            email: userEmail,
            name,
            gender: selectedGender ?? "공개하지 않음",
            birth_year: year,
            birth_month: month,
            birth_day: day,
            avatar_url: publicUrl,
        }]);

        if (upsertError) return Alert.alert("프로필 저장 실패", upsertError.message);

        if (!isExistingProfile) {
            router.replace("/postlist");
        } else {
            router.back();
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <SafeAreaView style={styles.background}>
                    <View style={styles.container}>
                        <Text style={styles.text}>Profilesettings</Text>
                        <TouchableOpacity style={styles.profileImg} onPress={pickImage}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.profileImg} />
                            ) : (
                                <View style={styles.box}>
                                    <Text style={styles.boxText}>image</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.frame}>
                            <Text style={styles.title}>name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="name"
                                onChangeText={(text) => { if (text.length <= 10) setName(text); }}
                                value={name}
                            />
                        </View>
                        <View style={styles.frame}>
                            <Text style={styles.title}>gender</Text>
                            <View style={styles.genders}>
                                {genders.map((gender) => (
                                    <TouchableOpacity
                                        key={gender}
                                        style={[styles.genderButton, selectedGender === gender && styles.selectedBackground]}
                                        onPress={() => setSelectedGender(gender)}
                                    >
                                        <Text style={[styles.genderText, selectedGender === gender && styles.selectedTextColor]}>
                                            {gender}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View>
                            <Text style={styles.title}>생년월일</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={year} style={styles.year} onValueChange={(v) => setYear(v)}>
                                    {years.map(y => <Picker.Item key={y} label={`${y}`} value={y} />)}
                                </Picker>
                                <Picker selectedValue={month} style={styles.month} onValueChange={(v) => setMonth(v)}>
                                    {months.map(m => <Picker.Item key={m} label={`${m}`} value={m} />)}
                                </Picker>
                                <Picker selectedValue={day} style={styles.day} onValueChange={(v) => setDay(v)}>
                                    {days.map(d => <Picker.Item key={d} label={`${d}`} value={d} />)}
                                </Picker>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onFinish}>
                            <Text style={styles.button}>next</Text>
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
        marginHorizontal: 25,
        marginTop: 25,
        gap: 20,
    },
    box: {
        backgroundColor: 'rgba(240, 240, 229, 0.2)',
        width: '100%',
        height: '100%',
    },
    boxText: {
        margin: 'auto',
        color: '#f0f0e5'
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
        marginTop: 30,
        borderRadius: 8,
        backgroundColor: '#f0f0e5',
        color: '#9c7866',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: 18,
    },
})