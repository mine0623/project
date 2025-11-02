import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    Keyboard
} from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import PostCard from "./postCard";

export default function Search() {
    const { tag: tagQuery } = useLocalSearchParams<{ tag?: string }>();
    const [searchText, setSearchText] = useState(tagQuery ?? "");
    const [posts, setPosts] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [recommendedTags, setRecommendedTags] = useState<string[]>([]);

    useEffect(() => {
        getCurrentUser();
        fetchRecommendedTags();
    }, []);

    useEffect(() => {
        if ((searchText ?? "").trim() === "") {
            setPosts([]);
            return;
        }
        fetchPosts();
        Keyboard.dismiss();
    }, [searchText]);

    useEffect(() => {
        if (tagQuery) {
            setSearchText(tagQuery);
            Keyboard.dismiss();
        }
    }, [tagQuery]);

    const getCurrentUser = async () => {
        const { data, error } = await supabase.auth.getUser();
        if (!error) setCurrentUser(data.user);
    };

    const fetchRecommendedTags = async () => {
        const { data, error } = await supabase.from("posts").select("tags");
        if (error) return console.error("Error fetching tags:", error);

        const allTags = (data ?? []).map((post: any) => post.tags ?? []).flat();

        const tagCount: Record<string, number> = {};
        allTags.forEach((tag: string) => {
            if (tag) {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            }
        });

        const sortedTags = Object.entries(tagCount)
            .sort((a, b) => b[1] - a[1])
            .map(([tag]) => tag)
            .slice(0, 5);

        setRecommendedTags(sortedTags);
    };

    const fetchPosts = async () => {
        if (!searchText.trim()) {
            setPosts([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("posts")
                .select(`
                id,
                title,
                content,
                tags,
                images,
                created_at,
                profiles (
                    id,
                    name,
                    gender,
                    avatar_url,
                    birth_year
                ),
                hearts (
                    user_id
                ),
                comments (
                    id
                )
            `)
                .or(`title.ilike.%${searchText}%,content.ilike.%${searchText}%`)
                .contains("tags", [searchText]); // 태그도 같이 조회

            if (error) throw error;

            const formatted = (data ?? []).map((post: any) => ({
                ...post,
                profiles: post.profiles ?? null,
                hearts: Array.isArray(post.hearts) ? post.hearts : [],
                comments: Array.isArray(post.comments) ? post.comments : [],
            }));

            setPosts(formatted);
        } catch (error) {
            console.error("Error fetching posts:", error);
            setPosts([]);
        }
    };

    const handlePostPress = (post: any) => {
        router.push({
            pathname: "/postDetail",
            params: { post: JSON.stringify(post) },
        });
    };

    const renderPost = ({ item }: { item: any }) => (
        <TouchableOpacity onPress={() => handlePostPress(item)} activeOpacity={0.8}>
            <PostCard post={item} currentUser={currentUser} />
        </TouchableOpacity>
    );

    const handleIconPress = () => {
        if (searchText) {
            setSearchText("");
            setPosts([]);
        } else {
            router.back();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleIconPress}>
                    <AntDesign
                        name={searchText ? "arrowleft" : "close"}
                        size={30}
                        color="#f0f0e5"
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="검색어를 입력하세요"
                    placeholderTextColor="#f0f0e5"
                    value={searchText}
                    onChangeText={setSearchText}
                    autoFocus={!tagQuery}
                />
                <Ionicons name="search" size={20} color="#f0f0e5" />
            </View>

            {(searchText ?? "").trim() === "" && (
                <View style={styles.recommend}>
                    <Text style={styles.recommendText}>추천 검색어</Text>
                    <View style={styles.tags}>
                        {recommendedTags.map((tag, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setSearchText(tag);
                                }}
                            >
                                <Text style={styles.tag}>#{tag}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {(searchText ?? "").trim() !== "" && (
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: "center", marginTop: 50 }}>
                            <Text style={{ color: "#f0f0e5" }}>검색 결과가 없습니다.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 30,
        backgroundColor: '#9c7866',
        paddingBottom: 0,
        flexDirection: 'column',
        gap: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(240, 240, 229, 0.2)",
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    searchInput: { flex: 1, color: "#f0f0e5", fontSize: 16 },
    recommend: { gap: 10, marginTop: 30 },
    recommendText: { color: "#f0f0e5", fontSize: 20, fontWeight: "bold" },
    tags: { flexDirection: "row", gap: 8, marginTop: 5 },
    tag: {
        backgroundColor: "#bda08b",
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#f0f0e5",
        borderRadius: 20,
    },
});
