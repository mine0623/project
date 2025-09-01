import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    BackHandler,
    Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import PostCard from "@/app/(details)/postCard";

export default function Profile() {
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<string>("");
    const [posts, setPosts] = useState<any[]>([]);
    const [votes, setVotes] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedTab, setSelectedTab] = useState<"post" | "vote">("post");
    const [loadingVotes, setLoadingVotes] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
            Alert.alert("알림", "로그아웃 후 뒤로가기가 가능합니다.", [{ text: "확인" }]);
            return true;
        });
        return () => backHandler.remove();
    }, []);

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

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            router.replace("/login");
        } else {
            console.error("로그아웃 실패:", error.message);
        }
    };

    const confirmLogout = () => {
        Alert.alert(
            "로그아웃",
            "로그아웃하시겠습니까?",
            [
                { text: "취소", style: "cancel" },
                { text: "확인", onPress: handleLogout }
            ],
            { cancelable: true }
        );
    };

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
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            );
        }

        if (votes.length === 0) {
            return (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>아직 올린 투표가 없습니다.</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={votes}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                renderItem={({ item }) => {
                    const results: Record<string, number> = item.results ?? {};
                    const totalVotes = Object.values(results).reduce(
                        (sum, c) => sum + (typeof c === "number" ? c : 0),
                        0
                    );

                    return (
                        <View style={styles.voteCard}>
                            <Text style={styles.voteTitle}>{item.content}</Text>

                            {item.images?.length > 0 && (
                                <View style={styles.voteImageContainer}>
                                    {item.images.map((imgUrl: string, idx: number) => (
                                        <Image
                                            key={idx}
                                            source={{ uri: imgUrl }}
                                            style={styles.voteImage}
                                            resizeMode="cover"
                                        />
                                    ))}
                                </View>
                            )}

                            <View style={styles.resultsContainer}>
                                <View style={styles.singleResultBar}>
                                    {Object.entries(results).map(([choice, count], idx) => {
                                        const c = count as number;
                                        const percentage = totalVotes > 0 ? (c / totalVotes) * 100 : 0;

                                        return (
                                            <View
                                                key={choice}
                                                style={[
                                                    styles.singleResultSegment,
                                                    {
                                                        flex: c,
                                                        backgroundColor: idx === 0 ? "#f0f0e5" : "#b7aa93", // 선택지마다 색 구분
                                                    },
                                                ]}
                                            />
                                        );
                                    })}
                                </View>

                                <View style={styles.resultLabelRow}>
                                    {Object.entries(results).map(([choice, count]) => {
                                        const c = count as number;
                                        const percentage = totalVotes > 0 ? (c / totalVotes) * 100 : 0;

                                        return (
                                            <Text key={choice} style={styles.percentageText}>
                                                {choice}: {c}표 ({percentage.toFixed(1)}%)
                                            </Text>
                                        );
                                    })}
                                </View>
                            </View>


                            <Text style={styles.voteDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
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
                <TouchableOpacity onPress={confirmLogout} style={styles.logoutButton}>
                    <Text style={styles.logout}>로그아웃</Text>
                </TouchableOpacity>
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
    header: { margin: 30, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    logo: { color: "#f0f0e5", fontSize: 30, fontWeight: "bold" },
    logoutButton: { padding: 5 },
    error: { margin: 'auto', color: '#f0f0e5' },
    card: { marginVertical: 20, marginHorizontal: 30, backgroundColor: '#f0f0e51a', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 20 },
    name: { fontSize: 20, fontWeight: "bold", color: '#f0f0e5' },
    summary: { fontSize: 18, color: '#f0f0e5', marginTop: 4 },
    avatar: { width: 100, height: 100, borderRadius: 60 },
    info: { flex: 1, alignItems: 'center', marginLeft: 10, justifyContent: 'center' },
    tabContainer: { flexDirection: "row", borderRadius: 8, overflow: "hidden" },
    tabButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 15 },
    tabButtonSelected: { borderBottomColor: "#f0f0e580", borderBottomWidth: 1 },
    tabText: { fontSize: 18, color: "#f0f0e580" },
    tabTextSelected: { color: '#f0f0e5ff' },
    content: { flex: 1 },
    scene: { flex: 1 },
    logout: {
        color: '#9c7866',
        fontWeight: 'bold',
        backgroundColor: 'rgba(240, 240, 229, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    underline: { borderBottomWidth: 1, borderColor: "#f0f0e580", marginTop: 10 }, loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { color: "#f0f0e5" },
    voteCard: {
        backgroundColor: "rgba(240, 240, 229, 0.2)",
        borderRadius: 12,
        padding: 15,
        marginVertical: 12,
        marginHorizontal: 10,
    },
    voteTitle: { color: "#f0f0e5", fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    voteImageScroll: { marginBottom: 10 },
    voteImage: { width: 120, height: 120, borderRadius: 10, marginRight: 10 },
    resultsContainer: { gap: 8, marginTop: 5 },
    resultRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    choiceText: { color: "#f0f0e5", flex: 1 },
    resultBarBackground: {
        flex: 3,
        height: 10,
        backgroundColor: "#b7aa93",
        borderRadius: 5,
        overflow: "hidden",
    },
    resultBarForeground: {
        height: 10,
        backgroundColor: "#f0f0e5",
    },
    percentageText: { color: "#f0f0e5", textAlign: "right" },
    voteDate: { color: "rgba(240,240,229,0.5)", marginTop: 8, fontSize: 12, textAlign: "right" },
    voteImageContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 10,
        marginBottom: 10,
    },
    singleResultBar: {
        flexDirection: "row",
        height: 20,
        borderRadius: 10,
        overflow: "hidden",
        marginTop: 10,
        marginHorizontal: 20,
        backgroundColor: "#b7aa93",
    },
    singleResultSegment: {
        height: "100%",
    },
    resultLabelRow: {
        marginHorizontal: 20,
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
    },


});
