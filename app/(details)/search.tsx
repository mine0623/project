import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Image,
    TextInput,
} from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import PostCard from "./postCard";

export default function Search() {
    const [searchText, setSearchText] = useState("");
    const [posts, setPosts] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (searchText.trim() === "") {
            setPosts([]);
            return;
        }
        fetchPosts();
    }, [searchText]);

    const getCurrentUser = async () => {
        const { data, error } = await supabase.auth.getUser();
        if (!error) setCurrentUser(data.user);
    };

    const fetchPosts = async () => {
        let query = supabase
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
            .ilike("title", `%${searchText}%`);

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching posts:", error);
            setPosts([]);
            return;
        }

        const formatted = (data ?? []).map((post: any) => ({
            ...post,
            profiles: post.profiles ?? null,
            hearts: Array.isArray(post.hearts) ? post.hearts : [],
            comments: Array.isArray(post.comments) ? post.comments : [],
        }));

        setPosts(formatted);
    };

    const handlePostPress = (post: any) => {
        router.push({
            pathname: "/postDetail",
            params: { post: JSON.stringify(post) },
        });
    };

     const renderPost = ({ item }: { item: any }) => {
            return (
                <TouchableOpacity
                    onPress={() => handlePostPress(item)}
                    activeOpacity={0.8} // 터치 시 약간 투명해지는 효과
                >
                    <PostCard post={item} currentUser={currentUser} />
                </TouchableOpacity>
            );
        };

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
                    <AntDesign name={searchText ? "arrowleft" : "close"} size={30} color="#f0f0e5" />
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

            {searchText.trim() === "" && (
                <View style={styles.recommend}>
                    <Text style={styles.recommendText}>추천 검색어</Text>
                    <View style={styles.tags}>
                        <TouchableOpacity onPress={() => setSearchText("여름")}>
                            <Text style={styles.tag}>여름</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSearchText("룩북")}>
                            <Text style={styles.tag}>룩북</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            {searchText.trim() !== "" && (
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#9c7866"
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        margin: 30
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(240, 240, 229, 0.2)",
        marginHorizontal: 25,
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        color: "#f0f0e5",
        fontSize: 16
    },
    recommend: {
        gap: 10,
        marginHorizontal: 30,
        marginTop: 30
    },
    recommendText: {
        color: "#f0f0e5",
        fontSize: 20,
        fontWeight: "bold"
    },
    tags: {
        flexDirection: "row",
        justifyContent: "flex-start",
        gap: 8,
        alignItems: "center"
    },
    tag: {
        color: "#f0f0e5",
        fontSize: 15,
        backgroundColor: "rgba(240, 240, 229, 0.3)",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 30,
    },
    post: {
        marginTop: 25,
        flexDirection: "column"
    },
    tool: {
        flexDirection: "column",
        justifyContent: "flex-start",
        marginHorizontal: 20,
        gap: 5
    },
    main: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start"
    },
    img: {
        width: 80,
        height: 80,
        backgroundColor: "#bda08b",
        borderRadius: 8
    },
    postHeader: {
        marginHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 8
    },
    time: {
        color: "rgba(240, 240, 229, 0.5)"
    },
    articles: {
        gap: 5
    },
    profile: {
        flexDirection: "row",
        gap: 5,
        alignItems: "center",
        marginBottom: 5
    },
    name: {
        fontSize: 20,
        color: "#f0f0e5",
        fontWeight: "bold"
    },
    title: {
        color: "#f0f0e5",
        fontSize: 18,
        fontWeight: "bold"
    },
    text: {
        color: "#f0f0e5",
        fontSize: 18
    },
    icons: {
        marginHorizontal: 20,
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10
    },
    icon: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5
    },
    count: {
        fontSize: 15,
        color: "#f0f0e5"
    },
    underline: {
        marginTop: 25,
        borderBottomWidth: 1,
        borderColor: "rgba(240, 240, 229, 0.5)"
    },
    avatar: {
        width: 35,
        height: 35,
        borderRadius: 50
    },
});