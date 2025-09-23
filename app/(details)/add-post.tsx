import React, { useState, useEffect, } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Image,
    StyleSheet,
    FlatList,
    Alert,
} from "react-native";
import { AntDesign, FontAwesome6 } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

const decodeBase64 = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

export default function AddPost() {
    const [visible, setVisible] = useState(false);
    const [wishModalVisible, setWishModalVisible] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [images, setImages] = useState<{ uri: string; base64: string | null }[]>([]);
    const [selectedWishlist, setSelectedWishlist] = useState<any[]>([]);
    const [wishlist, setWishlist] = useState<any[]>([]);

    const [recommendedTags, setRecommendedTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>(["#추천", "#질문"]); // 기본 태그 포함
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");

    useEffect(() => {
        fetchRecommendedTags();
    }, []);

    const fetchRecommendedTags = async () => {
        const { data, error } = await supabase.from("posts").select("tags");
        if (error) return console.error("Error fetching tags:", error);

        const allPostTags = (data ?? []).map((post: any) => post.tags ?? []).flat();

        const tagCount: Record<string, number> = {};
        allPostTags.forEach((tag: string) => {
            if (tag && tag !== "추천" && tag !== "질문") {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            }
        });

        const sortedTags = Object.entries(tagCount)
            .sort((a, b) => b[1] - a[1])
            .map(([tag]) => `#${tag}`)
            .slice(0, 5);

        setRecommendedTags(sortedTags);


        setAllTags(prev => [...prev, ...sortedTags.filter(tag => !prev.includes(tag))]);
    };

    const openSheet = () => setVisible(true);
    const closeSheet = () => setVisible(false);

    const pickImage = async () => {
        const remaining = 5 - (images.length + selectedWishlist.length);
        if (remaining <= 0) {
            Alert.alert("선택 제한", "이미지와 위시리스트 합쳐서 최대 5개까지 선택 가능합니다.");
            return;
        }

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

        setVisible(false);
    };

    const fetchWishlist = async () => {
        try {
            const { data, error } = await supabase
                .from("wishlist")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setWishlist(data || []);
            setVisible(false);
            setWishModalVisible(true);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleWishlist = (item: any) => {
        const totalSelected = images.length + selectedWishlist.length;
        const alreadySelected = selectedWishlist.some(w => w.id === item.id);

        if (alreadySelected) {
            setSelectedWishlist(prev => prev.filter(w => w.id !== item.id));
            setImages(prev => prev.filter(img => img.uri !== item.image));
        } else {
            if (totalSelected >= 5) {
                Alert.alert("선택 제한", "이미지와 위시리스트 합쳐서 최대 5개까지 선택 가능합니다.");
                return;
            }
            setSelectedWishlist(prev => [...prev, item]);
            setImages(prev => [...prev, { uri: item.image, base64: null }]);
        }
    };

    const removeImage = (uri: string) => {
        setImages(prev => prev.filter(img => img.uri !== uri));
        setSelectedWishlist(prev => prev.filter(w => w.image !== uri));
    };

    const addNewTag = () => {
        if (!newTag.trim()) return;
        const tag = newTag.startsWith("#") ? newTag : `#${newTag}`;

        if (!allTags.includes(tag)) setAllTags([...allTags, tag]);
        if (!selectedTags.includes(tag)) setSelectedTags([...selectedTags, tag]);

        setNewTag("");
    };

    const handlePost = async () => {
        try {
            if (!title.trim() || !content.trim()) {
                Alert.alert("알림", "제목과 내용을 입력해주세요.");
                return;
            }

            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) {
                Alert.alert("에러", "로그인한 사용자를 찾을 수 없습니다.");
                return;
            }
            const user_id = userData.user.id;

            const uploadedUrls: string[] = [];
            for (const img of images) {
                if (img.base64) {
                    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                    const { error: uploadError } = await supabase.storage
                        .from("posts")
                        .upload(fileName, decodeBase64(img.base64), {
                            contentType: "image/jpeg",
                        });
                    if (uploadError) {
                        console.error(uploadError);
                        Alert.alert("업로드 실패", "이미지 업로드 중 오류가 발생했습니다.");
                        return;
                    }
                    const { data: publicUrl } = supabase.storage
                        .from("posts")
                        .getPublicUrl(fileName);
                    uploadedUrls.push(publicUrl.publicUrl);
                } else {
                    uploadedUrls.push(img.uri);
                }
            }

            const wishlistIds = selectedWishlist.map((w) => w.id);

            const tagsToSave = selectedTags.map(tag => tag.replace(/^#/, ""));

            const { error } = await supabase.from("posts").insert([
                {
                    user_id,
                    title,
                    content,
                    tags: tagsToSave,
                    images: uploadedUrls,
                    wishlist_ids: wishlistIds,
                },
            ]);

            if (error) {
                console.error(error);
                Alert.alert("에러", "게시물 저장 중 문제가 발생했습니다.");
                return;
            }

            Alert.alert("성공", "게시물이 등록되었습니다.");
            router.back();
        } catch (err) {
            console.error(err);
            Alert.alert("에러", "알 수 없는 오류가 발생했습니다. 다시 한 번 시도해 주세요");
        }
    };


    const combinedData = [...images.map(img => ({ uri: img.uri }))];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <AntDesign name="close" size={30} color="#f0f0e5" />
                </TouchableOpacity>
            </View>

            <View style={styles.boxContainer}>
                <FlatList
                    data={combinedData}
                    keyExtractor={(_, idx) => idx.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    ListHeaderComponent={() =>
                        combinedData.length < 5 ? (
                            <TouchableOpacity style={styles.box} onPress={openSheet}>
                                <FontAwesome6 name="add" size={25} color="#f0f0e5" />
                            </TouchableOpacity>
                        ) : null
                    }
                    renderItem={({ item }) => (
                        <View style={styles.box}>
                            <Image
                                source={{ uri: item.uri }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                            <TouchableOpacity
                                style={styles.deleteIcon}
                                onPress={() => removeImage(item.uri)}
                            >
                                <AntDesign name="closecircle" size={22} color="#f0f0e5" />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </View>

            <View style={styles.main}>
                <TextInput
                    style={styles.titleInput}
                    placeholder="제목을 입력해주세요."
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
            </View>

            <View style={{ marginHorizontal: 30, }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {allTags.map(tag => (
                        <TouchableOpacity
                            key={tag}
                            style={[styles.tag, selectedTags.includes(tag) && styles.selectedTag]}
                            onPress={() => {
                                if (selectedTags.includes(tag)) {
                                    setSelectedTags(selectedTags.filter(t => t !== tag));
                                } else {
                                    setSelectedTags([...selectedTags, tag]);
                                }
                            }}
                        >
                            <Text style={{ color: "#f0f0e5" }}>{tag}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ flexDirection: "row", marginVertical: 15, gap: 5 }}>
                    <TextInput
                        style={styles.newTagInput}
                        placeholder="새 태그 입력"
                        placeholderTextColor="rgba(240,240,229,0.5)"
                        value={newTag}
                        onChangeText={setNewTag}
                    />
                    <TouchableOpacity onPress={addNewTag} style={styles.addTagButton}>
                        <Text style={styles.addTagButton}>추가</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity onPress={handlePost}>
                <Text style={styles.button}>완료</Text>
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={closeSheet}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.popup}>
                                <Text style={styles.popupText}>choose</Text>
                                <View style={styles.add}>
                                    <TouchableOpacity onPress={pickImage}>
                                        <Text style={styles.addButton}>image</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={fetchWishlist}>
                                        <Text style={styles.addButton}>wish</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal visible={wishModalVisible} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => setWishModalVisible(false)}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modal, { maxHeight: "70%" }]}>
                                <Text style={styles.popupText}>wishlist</Text>
                                <FlatList
                                    data={wishlist}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.wishItem}
                                            onPress={() => toggleWishlist(item)}
                                        >
                                            <Image
                                                source={{ uri: item.image }}
                                                style={{ width: 60, height: 60, borderRadius: 8 }}
                                            />
                                            <View style={{ marginLeft: 10 }}>
                                                <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                                                <Text>{item.price}원</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#9c7866" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 40,
        marginHorizontal: 25,
        marginBottom: 15,
    },
    main: { marginTop: 20, marginHorizontal: 30 },
    titleInput: {
        borderColor: 'rgba(240, 240, 229, 0.5)',
        borderWidth: 0.5,
        borderRadius: 20,
        fontSize: 18,
        paddingHorizontal: 15,
        color: "#f0f0e5",
        padding: 10,
    },
    contentInput: {
        backgroundColor: 'rgba(240, 240, 229, 0.1)',
        marginVertical: 10,
        borderRadius: 10,
        height: 80,
        paddingVertical: 15,
        padding: 12,
        fontSize: 15,
        color: "#f0f0e5",
    },
    boxContainer: {
        marginTop: 10,
        marginHorizontal: 30,
        flexDirection: "row"
    },
    box: {
        borderRadius: 15,
        width: 150,
        height: 150,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(240,240,229,0.1)",
        marginRight: 10,
    },
    image: { width: "100%", height: "100%", borderRadius: 15 },
    tag: {
        borderRadius: 20,
        borderColor: 'rgba(240, 240, 229, 0.5)',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: '#f0f0e5',
        fontSize: 15,
    },
    selectedTag: {
        backgroundColor: "rgba(183, 170, 147, 1)",
    },
    newTagInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: "rgba(240,240,229,0.5)",
        borderRadius: 20,
        paddingHorizontal: 12,
        color: "#f0f0e5",
        height: 35,
    },
    addTagButton: {
        paddingHorizontal: 10,
        borderRadius: 20,
        fontWeight: 'bold',
        color: '#f0f0e5',
        backgroundColor: "#b7aa93",
        justifyContent: "center",
    },
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    popup: {
        width: "85%",
        maxHeight: "80%",
        backgroundColor: "#f0f0e5",
        borderRadius: 15,
        padding: 20,
    },
    modal: {
        width: "85%",
        maxHeight: "80%",
        backgroundColor: "#b7aa93",
        borderRadius: 15,
        padding: 20,
    },
    popupText: { fontSize: 20, marginBottom: 10 },
    add: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
    addButton: {
        marginVertical: 10,
        width: 130,
        textAlign: "center",
        color: "#f0f0e5",
        fontSize: 18,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: "#b7aa93",
    },
    button: {
        marginHorizontal: 30,
        color: "#9c7866",
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        borderRadius: 25,
        borderWidth: 1,
        borderColor: "#f0f0e5",
        paddingVertical: 12,
        marginTop: 20,
        backgroundColor: "#f0f0e5",
    },
    wishItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 5,
    },
    deleteIcon: {
        position: "absolute",
        top: 5,
        right: 5,
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: 50,
        padding: 2,
    },
});
