import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Alert,
    Modal,
    ScrollView,
    Image,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { decode as decodeBase64 } from "base64-arraybuffer";

export default function AddPost() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>(["여름", "추천", "질문", "룩북"]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [images, setImages] = useState<{ uri: string; base64: string | null }[]>([]);
    const [wishlist, setWishlist] = useState<any[]>([]);
    const [selectedWishlist, setSelectedWishlist] = useState<any[]>([]);
    const [optionModalVisible, setOptionModalVisible] = useState(false);
    const [wishModalVisible, setWishModalVisible] = useState(false);

    useEffect(() => {
        const fetchWishlist = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase
                .from("wishlist")
                .select("*")
                .eq("user_id", user.id);
            if (error) console.error(error);
            else setWishlist(data ?? []);
        };
        fetchWishlist();
    }, []);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const addTag = () => {
        const tag = newTag.trim();
        if (!tag) return;
        if (!tags.includes(tag)) setTags(prev => [...prev, tag]);
        if (!selectedTags.includes(tag)) setSelectedTags(prev => [...prev, tag]);
        setNewTag("");
    };

    const pickImage = async () => {
        const remaining = 5 - (images.length + selectedWishlist.length);
        if (remaining <= 0) return;

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("갤러리 권한이 필요합니다.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 1,
            base64: true,
        });

        if (!result.canceled && result.assets) {
            const newImages = result.assets.map(asset => ({
                uri: asset.uri,
                base64: asset.base64 ?? null,
            }));
            setImages(prev => [...prev, ...newImages]);
        }

        setOptionModalVisible(false);
    };

    const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

    const toggleWishlist = (item: any) => {
        const totalSelected = images.length + selectedWishlist.length;
        const alreadySelected = selectedWishlist.some(w => w.id === item.id);
        if (alreadySelected) {
            setSelectedWishlist(prev => prev.filter(w => w.id !== item.id));
        } else {
            if (totalSelected >= 5) {
                Alert.alert("선택 제한", "이미지와 위시리스트 합쳐서 최대 5개까지 선택 가능합니다.");
                return;
            }
            setSelectedWishlist(prev => [...prev, item]);
        }
    };

    const removeWishlist = (id: string) => setSelectedWishlist(prev => prev.filter(w => w.id !== id));

    const getArrayBufferForUpload = async (uri: string, fallbackBase64?: string | null) => {
        try {
            const res = await fetch(uri);
            const ab = res.arrayBuffer ? await res.arrayBuffer() : await (await res.blob()).arrayBuffer();
            if (ab && ab.byteLength > 0) return ab;
        } catch (e) {
            console.warn("fetch->arrayBuffer failed:", e);
        }
        if (fallbackBase64) {
            try {
                return decodeBase64(fallbackBase64);
            } catch (e) {
                console.warn("base64 decode failed:", e);
            }
        }
        try {
            const fsB64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            return decodeBase64(fsB64);
        } catch (e) {
            console.warn("fs base64 decode failed:", e);
        }
        throw new Error("이미지 바이트를 확보하지 못했습니다.");
    };

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
            default:
                return "image/*";
        }
    };

    const extFromMime = (mime: string) => {
        if (mime.includes("jpeg")) return "jpg";
        if (mime.includes("png")) return "png";
        if (mime.includes("webp")) return "webp";
        return "bin";
    };

    const submitPost = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const imageUrls: string[] = [];

            for (const img of images) {
                const mime = mimeFromUri(img.uri);
                const ext = extFromMime(mime);
                const fileName = `${Date.now()}.${ext}`;
                const arrayBuffer = await getArrayBufferForUpload(img.uri, img.base64);
                const { error } = await supabase.storage.from("posts").upload(fileName, arrayBuffer, { contentType: mime, upsert: true });
                if (error) throw error;

                const { data: pub } = supabase.storage.from("posts").getPublicUrl(fileName);
                imageUrls.push(pub?.publicUrl ?? "");
            }

            const { error } = await supabase.from("posts").insert([{
                user_id: user.id,
                title,
                content,
                tags: selectedTags,
                images: imageUrls,
                wishlist_ids: selectedWishlist.map(w => w.id),
            }]);

            if (error) throw error;
            Alert.alert("저장 완료!");
            router.back();
        } catch (err: any) {
            console.log(err);
            Alert.alert("저장 실패", err.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <AntDesign name="close" size={30} color="#f0f0e5" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={submitPost}>
                    <Text style={styles.buttonText}>post</Text>
                </TouchableOpacity>
            </View>

            {/* 이미지 + 위시 박스 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                <TouchableOpacity style={styles.box} onPress={() => setOptionModalVisible(true)}>
                    <Ionicons name="add" size={25} color="#f0f0e5" />
                </TouchableOpacity>
                {images.map((img, idx) => (
                    <TouchableOpacity key={`img-${idx}`} style={styles.itemBox} onPress={() => removeImage(idx)}>
                        <Image source={{ uri: img.uri }} style={styles.itemImage} />
                    </TouchableOpacity>
                ))}
                {selectedWishlist.map((wish, idx) => (
                    <TouchableOpacity key={`wish-${idx}`} style={styles.itemBox} onPress={() => removeWishlist(wish.id)}>
                        <Text style={styles.itemText}>{wish.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* 옵션 모달 */}
            <Modal transparent visible={optionModalVisible} animationType="fade" onRequestClose={() => setOptionModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <TouchableOpacity style={styles.modalButton} onPress={pickImage}>
                            <Text style={styles.modalButtonText}>이미지 추가</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={() => { setOptionModalVisible(false); setWishModalVisible(true); }}>
                            <Text style={styles.modalButtonText}>위시리스트 선택</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: "#ccc" }]} onPress={() => setOptionModalVisible(false)}>
                            <Text style={[styles.modalButtonText, { color: "#333" }]}>취소</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 위시 모달 */}
            <Modal transparent visible={wishModalVisible} animationType="fade" onRequestClose={() => setWishModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>위시 선택</Text>
                        <ScrollView style={{ maxHeight: 200 }}>
                            {wishlist.map(w => (
                                <TouchableOpacity key={w.id} style={styles.modalButton} onPress={() => { toggleWishlist(w); setWishModalVisible(false); }}>
                                    <Text>{w.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: "#ccc" }]} onPress={() => setWishModalVisible(false)}>
                            <Text style={{ color: "#333" }}>취소</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 제목 / 내용 / 태그 */}
            <View style={styles.main}>
                <TextInput
                    style={styles.titleInput}
                    placeholder="제목을 입력해주세요"
                    placeholderTextColor="rgba(240,240,229,0.5)"
                    value={title}
                    onChangeText={setTitle}
                />
                <TextInput
                    style={styles.contentInput}
                    placeholder="자유롭게 내용을 작성해 주세요."
                    placeholderTextColor="rgba(240,240,229,0.5)"
                    multiline
                    value={content}
                    onChangeText={setContent}
                    maxLength={150}
                />

                {/* 태그 */}
                <View style={{ gap: 10 }}>
                    <View style={styles.tags}>
                        {tags.map(tag => {
                            const selected = selectedTags.includes(tag);
                            return (
                                <TouchableOpacity key={tag} style={[styles.tag, selected && styles.tagSelected]} onPress={() => toggleTag(tag)}>
                                    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>#{tag}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <View style={styles.addTagContainer}>
                        <TextInput
                            style={styles.addTagInput}
                            placeholder="새 태그 입력"
                            placeholderTextColor="rgba(240,240,229,0.5)"
                            value={newTag}
                            onChangeText={setNewTag}
                            onSubmitEditing={addTag}
                        />
                        <TouchableOpacity onPress={addTag}>
                            <Text style={styles.addTagButton}>추가</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const BOX_SIZE = 80;
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#9c7866", paddingTop: 50 },
    header: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, marginBottom: 20 },
    button: { backgroundColor: "#f0f0e5", paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20 },
    buttonText: { fontSize: 16, fontWeight: "bold", color: "#9c7866" },
    scrollContainer: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 20 },
    box: { width: BOX_SIZE, height: BOX_SIZE, borderRadius: 8, backgroundColor: "rgba(240,240,229,0.1)", alignItems: "center", justifyContent: "center", marginRight: 10 },
    itemBox: { width: BOX_SIZE, height: BOX_SIZE, borderRadius: 8, backgroundColor: "#f0f0f0", marginRight: 10, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    itemImage: { width: "100%", height: "100%", resizeMode: "cover" },
    itemText: { fontSize: 14, textAlign: "center" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    modalBox: { width: 250, backgroundColor: "#fff", borderRadius: 12, padding: 20, alignItems: "center" },
    modalButton: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#ddd", width: "100%", alignItems: "center" },
    modalButtonText: { fontWeight: "bold" },
    modalTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
    main: { marginHorizontal: 20, gap: 10 },
    titleInput: { fontSize: 20, fontWeight: "bold", color: "#f0f0e5", marginBottom: 10 },
    contentInput: { height: 100, fontSize: 16, color: "#f0f0e5", textAlignVertical: "top" },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(240,240,229,0.2)", borderRadius: 12 },
    tagSelected: { backgroundColor: "#f0f0e5" },
    tagText: { color: "#f0f0e5" },
    tagTextSelected: { color: "#9c7866" },
    addTagContainer: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    addTagInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: "#f0f0e5", color: "#f0f0e5" },
    addTagButton: { color: "#f0f0e5", fontWeight: "bold" },
});
