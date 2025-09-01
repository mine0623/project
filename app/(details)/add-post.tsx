import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ScrollView,
    Image,
    Alert,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
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

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 1,
            base64: true,
        });

        if (!result.canceled) {
            const newImages = result.assets.map(asset => ({
                uri: asset.uri,
                base64: asset.base64 ?? null,
            }));
            setImages(prev => [...prev, ...newImages]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

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

    const getArrayBufferForUpload = async (uri: string, fallbackBase64?: string | null) => {
        try {
            const res = await fetch(uri);
            const ab = res.arrayBuffer ? await res.arrayBuffer() : await (await res.blob()).arrayBuffer();
            if (ab && ab.byteLength > 0) return ab;
        } catch (e) { console.warn("fetch->arrayBuffer failed:", e); }

        if (fallbackBase64) {
            try { return decodeBase64(fallbackBase64); } catch (e) { console.warn("base64 decode failed:", e); }
        }

        try {
            const fsB64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            return decodeBase64(fsB64);
        } catch (e) { console.warn("fs base64 decode failed:", e); }

        throw new Error("이미지 바이트 확보 실패");
    };

    const uploadImages = async () => {
        const uploadedUrls: string[] = [];
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) { Alert.alert("로그인 필요"); return []; }

        for (let i = 0; i < images.length; i++) {
            const { uri, base64 } = images[i];
            const mime = mimeFromUri(uri);
            const ext = extFromMime(mime);
            const fileName = `posts/${user.id}_${Date.now()}_${i}.${ext}`;

            try {
                const arrayBuffer = await getArrayBufferForUpload(uri, base64);
                const { error: uploadError } = await supabase.storage
                    .from("posts")
                    .upload(fileName, new Uint8Array(arrayBuffer), { contentType: mime, upsert: true });

                if (uploadError) throw uploadError;
                const { data: pub } = supabase.storage.from("posts").getPublicUrl(fileName);
                uploadedUrls.push(pub?.publicUrl ?? "");
            } catch (e: any) { Alert.alert("업로드 실패", e?.message ?? "오류"); }
        }

        return uploadedUrls;
    };

    const submitPost = async () => {
        if (!title.trim()) return Alert.alert("제목을 입력해주세요");
        if (!content.trim()) return Alert.alert("내용을 입력해주세요");

        const imageUrls = await uploadImages();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return Alert.alert("로그인 필요");

        const { error } = await supabase.from("posts").insert([{
            user_id: user.id,
            title,
            content,
            tags: selectedTags,
            images: imageUrls,
            wishlist_ids: selectedWishlist.map(w => w.id),
        }]);

        if (error) { Alert.alert("업로드 실패", error.message); return; }

        setTitle(""); setContent(""); setSelectedTags([]); setImages([]); setNewTag(""); setSelectedWishlist([]);
        Alert.alert("성공", "게시물이 등록되었습니다!");
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <AntDesign name="close" size={30} color="#f0f0e5" />
                </TouchableOpacity>
            </View>

            <View style={styles.main}>
                <TextInput
                    style={styles.title}
                    placeholder="제목을 입력해주세요"
                    placeholderTextColor="rgba(240,240,229,0.5)"
                    value={title}
                    onChangeText={setTitle}
                />

                <TextInput
                    style={styles.text}
                    placeholder="자유롭게 내용을 작성해 주세요."
                    placeholderTextColor="rgba(240,240,229,0.5)"
                    multiline
                    value={content}
                    onChangeText={setContent}
                    maxLength={150}
                />

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
                        <TouchableOpacity onPress={addTag} style={styles.addTagButton}>
                            <Text style={{ color: "#f0f0e5" }}>추가</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ marginTop: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", alignItems: "center" }}>
                        {images.length + selectedWishlist.length < 5 && (
                            <TouchableOpacity style={styles.box} onPress={pickImage}>
                                <Text style={styles.tagText}>image</Text>
                            </TouchableOpacity>
                        )}
                        {images.map((imgObj, index) => (
                            <TouchableOpacity key={index} onPress={() => removeImage(index)}>
                                <Image source={{ uri: imgObj.uri }} style={styles.image} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={{ marginTop: 20 }}>
                    <Text style={{ color: "#f0f0e5", fontSize: 16, marginBottom: 10 }}>wishlist</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 120 }}>
                        {wishlist.map(item => {
                            const isSelected = selectedWishlist.some(w => w.id === item.id);
                            return (
                                <TouchableOpacity key={item.id} onPress={() => toggleWishlist(item)} style={[styles.wishlistCard, isSelected && styles.wishlistCardSelected]}>
                                    <Image source={{ uri: item.image }} style={styles.wishlistImage} />
                                    <View style={styles.wishlistInfo}>
                                        <Text numberOfLines={1} style={styles.wishlistName}>{item.brand}</Text>
                                        <Text numberOfLines={1} style={styles.wishlistName}>{item.name}</Text>
                                        <Text style={styles.wishlistPrice}>{item.price}원</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <TouchableOpacity style={styles.button} onPress={submitPost}>
                    <Text style={styles.buttonText}>post</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#9c7866" },
    header: { flexDirection: "row", justifyContent: "space-between", margin: 30 },
    main: { marginTop: 20, gap: 10, marginHorizontal: 25 },
    title: { fontSize: 20, fontWeight: "bold", color: "#f0f0e5", borderBottomWidth: 1, paddingBottom: 10, borderColor: "rgba(240, 240, 229, 0.5)" },
    text: { height: 120, padding: 10, borderRadius: 8, backgroundColor: "rgba(240, 240, 230, 0.05)", color: "#f0f0e5", fontSize: 18 },
    tags: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    tag: { borderWidth: 1, borderColor: "rgba(240, 240, 229, 0.5)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
    tagSelected: { backgroundColor: "#f0f0e5" },
    tagText: { color: "#f0f0e5" },
    tagTextSelected: { color: "#b7aa93", fontWeight: "bold" },
    addTagContainer: { flexDirection: "row", marginTop: 8, alignItems: "center" },
    addTagInput: { flex: 1, borderWidth: 1, borderColor: "rgba(240,240,229,0.5)", borderRadius: 20, paddingHorizontal: 12, color: "#f0f0e5", height: 40 },
    addTagButton: { marginLeft: 8, backgroundColor: "rgba(240,240,229,0.5)", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, justifyContent: "center", alignItems: "center" },
    box: { backgroundColor: "rgba(240, 240, 229, 0.1)", width: 80, height: 80, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    image: { width: 80, height: 80, marginLeft: 8, borderRadius: 8 },
    wishlistCard: { width: 100, marginRight: 10 },
    wishlistCardSelected: { borderWidth: 1, borderColor: "#f0f0e5", borderRadius: 8 },
    wishlistImage: { width: "100%", height: 80, borderRadius: 8 },
    wishlistInfo: { padding: 4 },
    wishlistName: { color: "#f0f0e5", fontSize: 12 },
    wishlistPrice: { color: "#f0f0e5", fontSize: 12, fontWeight: "bold" },
    button: { marginTop: 20, backgroundColor: "#f0f0e5", paddingVertical: 15, borderRadius: 20, alignItems: "center", justifyContent: "center", marginHorizontal: 25, marginBottom: 20 },
    buttonText: { fontSize: 16, fontWeight: "bold", color: "#9c7866" },
});
