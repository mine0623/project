import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Profile() {
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<string>("");
    const [posts, setPosts] = useState<any[]>([]);
    const [votes, setVotes] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedTab, setSelectedTab] = useState<"post" | "vote">("post");
    const [loadingVotes, setLoadingVotes] = useState(true);

    // 현재 사용자 + 프로필 불러오기
    useEffect(() => {
        const loadUserAndProfile = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                    console.error("로그인 필요:", userError);
                    setLoading(false);
                    return;
                }
                setCurrentUser(user);

                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (profileError || !profileData) {
                    console.error("프로필 불러오기 실패:", profileError);
                    setLoading(false);
                    return;
                }

                setProfile(profileData);
                const age = new Date().getFullYear() - profileData.birth_year;
                const ageGroup = Math.floor(age / 10) * 10;
                setSummary(`${ageGroup}대 ${profileData.gender ?? "공개하지 않음"}`);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadUserAndProfile();
    }, []);

    // 게시물 불러오기
    useEffect(() => {
        if (!currentUser) return;

        const fetchPosts = async () => {
            const { data, error } = await supabase
                .from("posts")
                .select(`
          id, title, content, tags, images, created_at,
          profiles ( id, name, gender, avatar_url, birth_year ),
          hearts ( user_id ),
          comments ( id )
        `)
                .eq("user_id", currentUser.id);

            if (error) {
                console.error("게시물 불러오기 실패:", error);
                setPosts([]);
                return;
            }

            setPosts((data ?? []).map((p: any) => ({
                ...p,
                profiles: p.profiles ?? null,
                hearts: Array.isArray(p.hearts) ? p.hearts : [],
                comments: Array.isArray(p.comments) ? p.comments : [],
            })));
        };

        fetchPosts();
    }, [currentUser]);

    // 내 투표 불러오기 (vote_options 제거, vote_results 기반)
    useEffect(() => {
        if (!currentUser) return;

        const fetchMyVotes = async () => {
            setLoadingVotes(true);
            const { data: votesData, error: votesError } = await supabase
                .from("votes")
                .select("*")
                .eq("user_id", currentUser.id)
                .order("created_at", { ascending: false });

            if (votesError) {
                console.error("내 투표 불러오기 실패:", votesError);
                setVotes([]);
                setLoadingVotes(false);
                return;
            }

            const votesWithResults = await Promise.all(
                (votesData ?? []).map(async (vote: any) => {
                    const { data: resultsData } = await supabase
                        .from("vote_results")
                        .select("choice")
                        .eq("vote_id", vote.id);

                    const results: Record<string, number> = {};
                    (resultsData || []).forEach((r: any) => {
                        results[r.choice] = (results[r.choice] || 0) + 1;
                    });

                    return { ...vote, results };
                })
            );

            setVotes(votesWithResults);
            setLoadingVotes(false);
        };

        fetchMyVotes();
    }, [currentUser]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.error}>Loading...</Text>
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.error}>프로필을 찾을 수 없습니다.</Text>
            </SafeAreaView>
        );
    }

    const getAgeGroup = (birth_year: number | null) => {
        if (!birth_year) return "연령대 없음";
        const age = new Date().getFullYear() - birth_year;
        const group = Math.floor(age / 10) * 10;
        return `${group}대`;
    };

    const timeAgo = (date: string) => {
        const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
        if (diff < 60) return `${Math.floor(diff)}초 전`;
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        return `${Math.floor(diff / 86400)}일 전`;
    };

    // --- 게시물 렌더 ---
    const renderPost = ({ item }: { item: any }) => {
        const profile = item.profiles;
        const hasHeart = currentUser ? item.hearts.some((h: any) => h.user_id === currentUser.id) : false;

        const toggleHeart = async (postId: number) => {
            const updatedPosts = [...posts];
            const postIndex = updatedPosts.findIndex((p) => p.id === postId);
            if (postIndex === -1) return;

            const post = updatedPosts[postIndex];
            const hasHeart = post.hearts.some((h: any) => h.user_id === currentUser.id);

            if (hasHeart) {
                post.hearts = post.hearts.filter((h: any) => h.user_id !== currentUser.id);
                await supabase.from("hearts").delete().eq("post_id", postId).eq("user_id", currentUser.id);
            } else {
                post.hearts.push({ user_id: currentUser.id });
                await supabase.from("hearts").insert([{ post_id: postId, user_id: currentUser.id }]);
            }

            setPosts(updatedPosts);
        };

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: "/postDetail", params: { post: JSON.stringify(item) } })}
            >
                <View style={styles.post}>
                    <View style={styles.postHeader}>
                        <TouchableOpacity style={styles.profile}>
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.postAvatar} />
                            ) : (
                                <Ionicons name="person-circle-sharp" size={35} color="#b7aa93" />
                            )}
                            <Text style={styles.postName}>{profile?.name || "익명"}</Text>
                        </TouchableOpacity>
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
                                <Image source={{ uri: Array.isArray(item.images) ? item.images[0] : item.images }} style={styles.img} resizeMode="cover" />
                            ) : (
                                <View style={styles.img}>
                                    <Ionicons name="image-outline" size={40} color="#f0f0e5" />
                                </View>
                            )}
                        </View>
                        <View style={styles.tags}>
                            {item.tags?.map((tag: string, idx: number) => (
                                <Text key={idx} style={styles.tag}>#{tag}</Text>
                            ))}
                        </View>
                    </View>

                    <View style={styles.icons}>
                        <View style={styles.icon}>
                            <TouchableOpacity onPress={() => toggleHeart(item.id)}>
                                <Ionicons name="heart" size={27} color={hasHeart ? "#e5c1bd" : "rgba(240, 240, 229, 0.2)"} />
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
            </TouchableOpacity>
        );
    };

    const PostView = () => (
        <View style={styles.scene}>
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );

    const VoteView = () => {
        if (loadingVotes) {
            return (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "#f0f0e5" }}>Loading...</Text>
                </View>
            );
        }

        if (votes.length === 0) {
            return (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "#f0f0e5" }}>아직 올린 투표가 없습니다.</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={votes}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                    const results: Record<string, number> = item.results ?? {};
                    const totalVotes = Object.values(results).reduce((sum, c) => sum + (typeof c === "number" ? c : 0), 0);

                    return (
                        <View style={{
                            backgroundColor: "rgba(240,240,229,0.1)",
                            margin: 10,
                            borderRadius: 10,
                            padding: 15,
                        }}>
                            <Text style={{ color: "#f0f0e5", fontSize: 18, fontWeight: "bold" }}>{item.content}</Text>

                            {item.images?.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                                    {item.images.map((imgUrl: string, idx: number) => (
                                        <Image
                                            key={idx}
                                            source={{ uri: imgUrl }}
                                            style={{ width: 150, height: 150, borderRadius: 10, marginRight: 10 }}
                                            resizeMode="cover"
                                        />
                                    ))}
                                </ScrollView>
                            )}

                            <View style={{ marginTop: 10 }}>
                                {Object.entries(results).map(([choice, count]) => {
                                    const c = count as number;
                                    const percentage = totalVotes > 0 ? ((c / totalVotes) * 100).toFixed(1) : "0";
                                    return (
                                        <Text key={choice} style={{ color: "rgba(240,240,229,0.7)" }}>
                                            {choice}: {c}표 ({percentage}%)
                                        </Text>
                                    );
                                })}
                            </View>

                            <Text style={{ color: "rgba(240,240,229,0.5)", marginTop: 5 }}>
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    );
                }}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>profiles</Text>
            </View>

            <TouchableOpacity style={styles.card} onPress={() => router.push('/profilesettings')}>
                {profile.avatar_url && <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />}
                <View style={styles.info}>
                    <Text style={styles.name}>{profile.name}</Text>
                    <Text style={styles.summary}>{summary}</Text>
                </View>
            </TouchableOpacity>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, selectedTab === "post" && styles.tabButtonSelected]}
                    onPress={() => setSelectedTab("post")}
                >
                    <Text style={[styles.tabText, selectedTab === "post" && styles.tabTextSelected]}>게시물</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, selectedTab === "vote" && styles.tabButtonSelected]}
                    onPress={() => setSelectedTab("vote")}
                >
                    <Text style={[styles.tabText, selectedTab === "vote" && styles.tabTextSelected]}>투표</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {selectedTab === "post" ? <PostView /> : <VoteView />}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#9c7866" },
    header: { margin: 30, marginBottom: 10 },
    logo: { color: "#f0f0e5", fontSize: 30, fontWeight: "bold" },
    error: { margin: 'auto', color: '#f0f0e5' },
    card: { marginVertical: 20, marginHorizontal: 30, backgroundColor: 'rgba(240,240,229,0.1)', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 20 },
    name: { fontSize: 20, fontWeight: "bold", color: '#f0f0e5' },
    summary: { fontSize: 18, color: '#f0f0e5', marginTop: 4 },
    avatar: { width: 100, height: 100, borderRadius: 60 },
    info: { flex: 1, alignItems: 'center', marginLeft: 10, justifyContent: 'center' },
    postAvatar: { width: 35, height: 35, borderRadius: 50 },
    post: { marginTop: 25, flexDirection: 'column' },
    tool: { flexDirection: 'column', justifyContent: 'flex-start', marginHorizontal: 20, gap: 5 },
    main: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    img: { width: 80, height: 80, backgroundColor: '#bda08b', borderRadius: 8 },
    postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8 },
    time: { color: 'rgba(240,240,229,0.5)' },
    articles: { gap: 5 },
    profile: { marginLeft: 20, flexDirection: 'row', gap: 5, alignItems: 'center', marginBottom: 5 },
    postName: { fontSize: 20, color: '#f0f0e5', fontWeight: 'bold' },
    title: { color: '#f0f0e5', fontSize: 18, fontWeight: 'bold' },
    text: { color: '#f0f0e5', fontSize: 18 },
    icons: { marginHorizontal: 20, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    icon: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    count: { fontSize: 15, color: '#f0f0e5' },
    tags: { marginTop: 5, flexDirection: 'row', gap: 8, alignItems: 'center' },
    tag: { backgroundColor: '#bda08b', paddingHorizontal: 10, paddingVertical: 8, color: '#f0f0e5', borderRadius: 20 },
    underline: { marginTop: 25, borderBottomWidth: 1, borderColor: 'rgba(240,240,229,0.5)' },
    tabContainer: { flexDirection: "row", borderRadius: 8, overflow: "hidden" },
    tabButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 15 },
    tabButtonSelected: { borderBottomColor: "rgba(240,240,229,0.5)", borderBottomWidth: 1 },
    tabText: { fontSize: 18, color: "rgba(240,240,229,0.5)" },
    tabTextSelected: { color: '#f0f0e5ff' },
    content: { flex: 1 },
    scene: { flex: 1 },
});
