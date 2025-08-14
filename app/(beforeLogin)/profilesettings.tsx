import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, TextInput, Image, StyleSheet, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/lib/supabase";
// ✅ base64 -> ArrayBuffer 변환 유틸
import { decode as decodeBase64 } from "base64-arraybuffer";

export default function Profilesettings() {
    const [name, setName] = useState("");
    const [selectedGender, setSelectedGender] = useState<string | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null); // ✅ fallback 용
    const [year, setYear] = useState(2000);
    const [month, setMonth] = useState(1);
    const [day, setDay] = useState(1);
    const router = useRouter();
    const { email } = useLocalSearchParams();
    const genders = ["남자", "여자", "공개하지 않음"];

    const years = useMemo(() => Array.from({ length: 2025 - 1980 + 1 }, (_, i) => 1980 + i), []);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    const days = useMemo(
        () => Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1),
        [year, month]
    );

    // ✅ 간단 MIME 도우미
    const mimeFromUri = (uri?: string | null) => {
        if (!uri) return "application/octet-stream";
        const ext = uri.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "png":
                return "image/png";
            case "webp":
                return "image/webp";
            case "heic":
                return "image/heic";
            default:
                return "image/*";
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

        // ✅ base64도 같이 받아둔다 (최후의 보루)
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
            base64: true, // ✅ 중요
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            setImageUri(asset.uri);
            setImageBase64(asset.base64 ?? null);
            // 디버깅에 도움 되는 로그
            try {
                const info = await FileSystem.getInfoAsync(asset.uri);
                if (info.exists && !info.isDirectory) {
                    console.log("Picked file size:", info.size ?? "unknown");
                } else {
                    console.log("파일이 없거나 디렉토리입니다.");
                }

            } catch(error) {
                 console.error("파일 정보 가져오기 실패:", error);
            }
        }
    };

    // ✅ 가장 튼튼한 업로드 바이트 확보 루틴
    const getArrayBufferForUpload = async (uri: string, fallbackBase64?: string | null) => {
        // 1) 정공법: fetch -> arrayBuffer
        try {
            const res = await fetch(uri);
            // 일부 RN/Expo 환경은 res.arrayBuffer 미구현 → blob 경유
            const ab = res.arrayBuffer ? await res.arrayBuffer() : await (await res.blob()).arrayBuffer();
            if (ab && ab.byteLength > 0) return ab;
            console.warn("arrayBuffer empty, fallback to base64");
        } catch (e) {
            console.warn("fetch->arrayBuffer failed:", e);
        }

        // 2) 빠른 우회: picker에서 받은 base64 사용
        if (fallbackBase64) {
            try {
                const ab = decodeBase64(fallbackBase64);
                if (ab && ab.byteLength > 0) return ab;
            } catch (e) {
                console.warn("picker base64 decode failed:", e);
            }
        }

        // 3) 최후: 파일 시스템에서 base64 읽어서 디코드
        try {
            const fsB64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const ab = decodeBase64(fsB64);
            if (ab && ab.byteLength > 0) return ab;
        } catch (e) {
            console.warn("fs base64 decode failed:", e);
        }

        throw new Error("이미지 바이트를 확보하지 못했어요.");
    };

    const onFinish = async () => {
        if (!imageUri) return Alert.alert("확인", "프로필 사진을 선택해주세요.");
        if (!name.trim()) return Alert.alert("확인", "이름을 입력해주세요.");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            Alert.alert("로그인 필요", "로그인이 필요합니다.");
            return;
        }

        // ✅ 파일 존재/크기 사전 점검 (진짜로 파일이 있는지)
        try {
            const info = await FileSystem.getInfoAsync(imageUri);
            if (!info.exists) {
                Alert.alert("오류", "선택한 파일을 찾을 수 없습니다.");
                return;
            }
            if ((info.size ?? 0) === 0) {
                console.warn("Local file size is 0, will rely on base64 fallback");
            }
        } catch { }

        const mime = mimeFromUri(imageUri);
        const ext = extFromMime(mime);
        const fileName = `${user.id}.${ext}`;

        let publicUrl: string | null = null;

        try {
            // ✅ 여기서 실제 바이트 확보 (0byte 방지)
            const arrayBuffer = await getArrayBufferForUpload(imageUri, imageBase64);
            console.log("Upload byteLength:", arrayBuffer.byteLength);

            // ✅ RN 환경에서 Blob 대신 ArrayBuffer로 업로드하는 게 더 안전
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, arrayBuffer, {
                    contentType: mime,
                    upsert: true,
                });

            if (uploadError) {
                console.error("이미지 업로드 에러:", uploadError);
                Alert.alert("업로드 실패", uploadError.message);
                return;
            }

            const { data: pub } = supabase.storage.from("avatars").getPublicUrl(fileName);
            publicUrl = pub?.publicUrl ?? null;
        } catch (e: any) {
            console.error("이미지 처리/업로드 실패:", e);
            Alert.alert("오류", e?.message ?? "이미지 업로드 중 문제가 발생했습니다.");
            return;
        }

        const { error: upsertError } = await supabase.from("profiles").upsert([
            {
                id: user.id,
                email,
                name,
                gender: selectedGender,
                birth_year: year,
                birth_month: month,
                birth_day: day,
                avatar_url: publicUrl,
            },
        ]);

        if (upsertError) {
            console.error("프로필 저장 에러:", upsertError);
            Alert.alert("프로필 저장 실패", upsertError.message);
            return;
        }

        // ✅ 성공 시 업로드된 이미지로 즉시 미리보기 갱신(확실성 ↑)
        if (publicUrl) setImageUri(publicUrl);

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
                <View>
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
        marginTop: 25,
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
        marginTop: 30,
        backgroundColor: '#f0f0e5',
        color: '#9c7866',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: 18,
    },
})