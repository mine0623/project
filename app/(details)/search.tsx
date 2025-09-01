import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
} from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
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
    }, [searchText]);

    useEffect(() => {
        if (tagQuery) {
            setSearchText(tagQuery);
        }
    }, [tagQuery]);

    const getCurrentUser = async () => {
        const { data, error } = await supabase.auth.getUser();
        if (!error) setCurrentUser(data.user);
    };

    const fetchRecommendedTags = async () => {
        const { data, error } = await supabase.from("posts").select("tags");
        if (error) return console.error("Error fetching tags:", error);

        // 모든 태그 모으기
        const allTags = (data ?? []).map((post: any) => post.tags ?? []).flat();

        // 태그 사용 빈도 계산
        const tagCount: Record<string, number> = {};
        allTags.forEach((tag: string) => {
            if (tag) {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            }
        });

        // [태그, 사용횟수] 배열 → 사용횟수 기준으로 정렬
        const sortedTags = Object.entries(tagCount)
            .sort((a, b) => b[1] - a[1]) // 사용횟수 내림차순
            .map(([tag]) => tag)         // 태그만 추출
            .slice(0, 10);               // 상위 10개

        setRecommendedTags(sortedTags);
    };


    const fetchPosts = async () => {
        try {
            const { data: textData, error: textError } = await supabase
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
                .or(`title.ilike.%${searchText}%,content.ilike.%${searchText}%`);

            if (textError) throw textError;

            const { data: tagData, error: tagError } = await supabase
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
                .contains("tags", [searchText]);

            if (tagError) throw tagError;

            const combined = [...(textData ?? []), ...(tagData ?? [])];
            const uniquePosts = Array.from(new Map(combined.map(p => [p.id, p])).values());

            const formatted = uniquePosts.map((post: any) => ({
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
                    autoFocus
                />
                <Ionicons name="search" size={20} color="#f0f0e5" />
            </View>

            {(searchText ?? "").trim() === "" && (
                <View style={styles.recommend}>
                    <Text style={styles.recommendText}>추천 검색어</Text>
                    <View style={styles.tags}>
                        {recommendedTags.map((tag, index) => (
                            <TouchableOpacity key={index} onPress={() => setSearchText(tag)}>
                                <Text style={styles.tag}>{tag}</Text>
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
    container: { flex: 1, backgroundColor: "#9c7866" },
    header: { flexDirection: "row", justifyContent: "space-between", margin: 30 },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(240, 240, 229, 0.2)",
        marginHorizontal: 25,
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    searchInput: { flex: 1, color: "#f0f0e5", fontSize: 16 },
    recommend: { gap: 10, marginHorizontal: 30, marginTop: 30 },
    recommendText: { color: "#f0f0e5", fontSize: 20, fontWeight: "bold" },
    tags: { flexDirection: "row", justifyContent: "flex-start", gap: 8, alignItems: "center" },
    tag: {
        color: "#f0f0e5",
        fontSize: 15,
        backgroundColor: "rgba(240, 240, 229, 0.3)",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 30,
    },
});
