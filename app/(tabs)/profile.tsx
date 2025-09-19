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

    /** 게시물 불러오기 */
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

    /** 투표 + 결과 + 이미지 불러오기 */
    useEffect(() => {
        if (!currentUser) return;

        const fetchMyVotesWithImages = async () => {
            setLoadingVotes(true);

            // 1. 내 투표 가져오기
            const { data: votesData, error: votesError } = await supabase
                .from("votes")
                .select("*")
                .eq("user_id", currentUser.id)
                .order("created_at", { ascending: false });

            if (votesError || !votesData) {
                console.error("내 투표 불러오기 실패:", votesError);
                setVotes([]);
                setLoadingVotes(false);
                return;
            }

            // 2. 응답 집계
            const votesWithResults = await Promise.all(
                votesData.map(async (vote: any) => {
                    const { data: resultsData, error } = await supabase
                        .from("vote_responses")
                        .select("choice")
                        .eq("vote_id", vote.id);

                    if (error) {
                        console.error("vote_responses 불러오기 오류:", error);
                        return { ...vote, results: {} };
                    }

                    const results: Record<string, number> = {};
                    const isBuyOrNot = !vote.second_choice_content && !vote.second_choice_wish_id;

                    (resultsData || []).forEach((r: any) => {
                        if (isBuyOrNot) {
                            if (r.choice === "살까") results["first"] = (results["first"] || 0) + 1;
                            else if (r.choice === "말까") results["second"] = (results["second"] || 0) + 1;
                        } else {
                            if (r.choice === "A") results["first"] = (results["first"] || 0) + 1;
                            else if (r.choice === "B") results["second"] = (results["second"] || 0) + 1;
                        }
                    });

                    return { ...vote, results };
                })
            );

            // 3. wishlist 이미지 가져오기
            const wishIds = votesWithResults.flatMap((v) =>
                [v.first_choice_wish_id, v.second_choice_wish_id].filter(Boolean)
            );

            let wishMap: Record<string, string> = {};
            if (wishIds.length > 0) {
                const { data: wishes } = await supabase
                    .from("wishlist")
                    .select("id, image")
                    .in("id", wishIds);

                if (wishes) {
                    wishMap = Object.fromEntries(wishes.map((w) => [w.id, w.image]));
                }
            }

            // 4. 최종 데이터에 이미지 붙이기
            const finalVotes = votesWithResults.map((v) => ({
                ...v,
                first_choice_image: wishMap[v.first_choice_wish_id] || null,
                second_choice_image: wishMap[v.second_choice_wish_id] || null,
            }));

            setVotes(finalVotes);
            setLoadingVotes(false);
        };

        fetchMyVotesWithImages();
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
        Alert.alert("로그아웃", "로그아웃하시겠습니까?", [
            { text: "취소", style: "cancel" },
            { text: "확인", onPress: handleLogout }
        ]);
    };

    /** 게시물 카드 */
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

    /** 게시물 리스트 */
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

    /** 투표 삭제 */
    const handleDeleteVote = async (voteId: string) => {
        Alert.alert("투표 종료", "정말 종료하시겠습니까?", [
            { text: "취소", style: "cancel" },
            {
                text: "확인",
                onPress: async () => {
                    const { error: responseError } = await supabase
                        .from("vote_responses")
                        .delete()
                        .eq("vote_id", voteId);

                    if (responseError) {
                        console.error("응답 삭제 실패:", responseError);
                        Alert.alert("오류", "응답 삭제에 실패했습니다.");
                        return;
                    }

                    const { error: voteError } = await supabase
                        .from("votes")
                        .delete()
                        .eq("id", voteId);

                    if (voteError) {
                        console.error("투표 삭제 실패:", voteError);
                        Alert.alert("오류", "투표 삭제에 실패했습니다.");
                    } else {
                        setVotes((prev) => prev.filter((v) => v.id !== voteId));
                    }
                },
            },
        ]);
    };

    const renderVote = ({ item }: { item: any }) => {
        const results = item.results || {};

        const totalVotes = (results.first || 0) + (results.second || 0) || 1;

        const getResultText = (choice: "first" | "second", fallback: string) => {
            const count = results[choice] || 0;
            const percentage = (count / totalVotes) * 100;
            return `${Math.round(percentage)}% (${count}표)`;
        };

        return (
            <View style={styles.voteCard}>
                <Text style={styles.voteDate}>
                    {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("ko-KR")
                        : ""}
                </Text>

                <View style={styles.resultsContainer}>
                    {!item.second_choice_wish_id ? (
                        <View style={styles.singleChoiceRow}>
                            {item.first_choice_image && (
                                <Image
                                    source={{ uri: item.first_choice_image }}
                                    style={styles.voteImage}
                                />
                            )}
                            <View style={styles.singleChoiceResults}>
                                <Text style={styles.choiceText}>
                                    살까 : {getResultText("first", "선택")}
                                </Text>
                                <Text style={styles.choiceText}>
                                    말까 : {getResultText("second", "선택")}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <>
                            <View style={styles.choiceBox}>
                                {item.first_choice_image && (
                                    <Image
                                        source={{ uri: item.first_choice_image }}
                                        style={styles.voteImage}
                                    />
                                )}
                                <Text style={styles.choiceText}>
                                    {getResultText("first", "선택")}
                                </Text>
                            </View>

                            <View style={styles.choiceBox}>
                                {item.second_choice_image && (
                                    <Image
                                        source={{ uri: item.second_choice_image }}
                                        style={styles.voteImage}
                                    />
                                )}
                                <Text style={styles.choiceText}>
                                    {getResultText("second", "선택")}
                                </Text>
                            </View>
                        </>
                    )}
                </View>


                <TouchableOpacity
                    onPress={() => handleDeleteVote(item.id)}
                    style={styles.deleteButton}
                >
                    <Text style={styles.deleteButtonText}>종료하기</Text>
                </TouchableOpacity>
            </View>
        );
    };


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
            <SafeAreaView style={{ flex: 1 }}>
                <FlatList
                    data={votes}
                    renderItem={renderVote}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        );
    };

    /** 메인 UI */
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>프로필</Text>
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
    card: { marginVertical: 20, marginHorizontal: 30, backgroundColor: 'rgba(240, 240, 229, 0.1)', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 20 },
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
        color: '#f0f0e5',
        fontWeight: 'bold',
        backgroundColor: 'rgba(240, 240, 229, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    underline: { borderBottomWidth: 1, borderColor: "#f0f0e580", marginTop: 10 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { color: "#f0f0e5" },
    voteCard: {
        borderRadius: 8,
        padding: 15,
        paddingBottom: 20,
        marginTop: 20,
        marginVertical: 10,
        marginHorizontal: 20,
        backgroundColor: 'rgba(240, 240, 229, 0.1)'
    },
    voteDate: { marginHorizontal: 5, marginBottom: 10, color: "#f0f0e5", fontSize: 20 },
    deleteButton: { marginHorizontal: 20, backgroundColor: "#b7aa93", padding: 10, borderRadius: 12, marginTop: 10 },
    deleteButtonText: { color: "#f0f0e5", textAlign: "center", fontWeight: "bold" },
    resultsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 10,
    },
    choiceBox: { alignItems: "center", flex: 1 },
    singleChoiceRow: {
        flexDirection: "row",
        justifyContent: 'space-between',
        marginHorizontal: 20,
        gap: 20,
    },
    singleChoiceResults: {
        justifyContent: "center",
    },
    voteImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
        backgroundColor: "#eee",
    },
    choiceText: {
        color: '#f0f0e5',
        fontSize: 16,
        marginVertical: 4,
    },

});
