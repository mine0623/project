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

    const toggleHeart = async (postId: number) => {
        if (!currentUser) return;

        const updatedPosts = [...posts];
        const postIndex = updatedPosts.findIndex((p) => p.id === postId);
        if (postIndex === -1) return;

        const post = updatedPosts[postIndex];
        const hasHeart = post.hearts.some((h: any) => h.user_id === currentUser.id);

        if (hasHeart) {
            post.hearts = post.hearts.filter((h: any) => h.user_id !== currentUser.id);
            await supabase
                .from("hearts")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", currentUser.id);
        } else {
            post.hearts.push({ user_id: currentUser.id });
            await supabase.from("hearts").insert([{ post_id: postId, user_id: currentUser.id }]);
        }

        setPosts(updatedPosts);
    };

    // 나이대 계산 함수
    const getAgeGroup = (birth_year: number | null) => {
        if (!birth_year) return "연령대 없음";
        const age = new Date().getFullYear() - birth_year;
        if (age < 10) return "10세 미만";
        const group = Math.floor(age / 10) * 10;
        return `${group}대`;
    };

    const renderPost = ({ item }: { item: any }) => {
        const profile = item.profiles;
        const hasHeart = currentUser
            ? item.hearts.some((h: any) => h.user_id === currentUser.id)
            : false;

        return (
            <View style={styles.post}>
                <View style={styles.postHeader}>
                    <TouchableOpacity style={styles.profile}>
                        {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                        ) : (
                            <Ionicons name="person-circle-sharp" size={35} color="#b7aa93" />
                        )}
                        <Text style={styles.name}>{profile?.name || "익명"}</Text>
                    </TouchableOpacity>

                    {/* 나이대 + 성별 */}
                    <Text style={styles.time}>{getAgeGroup(profile?.birth_year)}</Text>
                    <Text style={styles.time}>|</Text>
                    <Text style={styles.time}>{profile?.gender || "성별 없음"}</Text>
                    <Text style={styles.time}>|</Text>
                    <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                </View>

                <View style={styles.tool}>
                    <View style={styles.main}>
                        <View style={styles.articles}>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.text}>{item.content}</Text>
                        </View>
                        {item.images?.length > 0 ? (
                            <Image source={{ uri: item.images[0] }} style={styles.img} resizeMode="cover" />
                        ) : (
                            <View style={styles.img}>
                                <Ionicons name="image-outline" size={40} color="#f0f0e5" />
                            </View>
                        )}
                    </View>

                    <View style={styles.tags}>
                        {item.tags?.map((tag: string, index: number) => (
                            <Text key={index} style={styles.tag}>
                                #{tag}
                            </Text>
                        ))}
                    </View>
                </View>

                <View style={styles.icons}>
                    <View style={styles.icon}>
                        <TouchableOpacity onPress={() => toggleHeart(item.id)}>
                            <Ionicons
                                name="heart"
                                size={27}
                                color={hasHeart ? "#e5c1bd" : "rgba(240, 240, 229, 0.2)"}
                            />
                        </TouchableOpacity>
                        <Text style={styles.count}>{item.hearts.length}</Text>
                    </View>
                    <View style={styles.icon}>
                        <Ionicons name="chatbox" size={27} color="#dfc8ba" />
                        <Text style={styles.count}>{item.comments.length}</Text>
                    </View>
                </View>

                <View style={styles.underline}></View>
            </View>
        );
    };

    const timeAgo = (date: string) => {
        const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
        if (diff < 60) return `${Math.floor(diff)}초 전`;
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        return `${Math.floor(diff / 86400)}일 전`;
    };

    // 검색 리셋 함수
    const handleIconPress = () => {
        if (searchText) {
            // 검색 중이면 상태만 초기화
            setSearchText("");
            setPosts([]);
        } else {
            // 검색창이 비어있으면 post 화면으로 이동
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

            {/* 추천 검색어 */}
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

            {/* 검색 결과 */}
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