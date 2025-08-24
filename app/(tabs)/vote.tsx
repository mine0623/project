import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    StyleSheet,
    Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome6 } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const getAgeGroup = (birth_year: number | null) => {
    if (!birth_year) return "연령대 없음";
    const age = new Date().getFullYear() - birth_year;
    if (age < 10) return "10세 미만";
    const group = Math.floor(age / 10) * 10;
    return `${group}대`;
};

export default function Vote() {
    const router = useRouter();
    const [votes, setVotes] = useState<any[]>([]);
    const [current, setCurrent] = useState<number>(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [showResult, setShowResult] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>("");

    // 투표 불러오기
    const fetchVotes = async () => {
        setLoading(true);
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            console.error("로그인 유저 없음");
            setLoading(false);
            return;
        }
        setCurrentUserId(user.id);

        // votes 가져오기
        const { data: votesData, error: votesError } = await supabase
            .from("votes")
            .select("*")
            .neq("user_id", user.id)
            .order("created_at", { ascending: false });
        if (votesError) console.error(votesError);

        // 관련 profiles 가져오기
        const userIds = votesData?.map(v => v.user_id) || [];
        const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("*")
            .in("id", userIds);
        if (profilesError) console.error(profilesError);

        // votes와 profiles 매칭
        const votesWithProfiles = votesData?.map(vote => ({
            ...vote,
            profiles: profilesData?.find(p => p.id === vote.user_id)
        }));

        setVotes(votesWithProfiles || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchVotes();
    }, []);

    // 투표 저장
    const saveVote = async (choice: string | number) => {
        const currentVote = votes[current];
        if (!currentVote) return;

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("vote_results").insert([
            {
                vote_id: currentVote.id,
                choice: choice,
                user_id: user.id, // ✅ user_id 포함
            },
        ]);
        if (error) console.error(error);
    };

    // 투표 결과 가져오기
    const fetchResults = async () => {
        const currentVote = votes[current];
        if (!currentVote) return;

        const { data, error } = await supabase
            .from("vote_results")
            .select("vote_id, choice")
            .eq("vote_id", currentVote.id);

        if (error) {
            console.error(error);
            return;
        }

        const counts: Record<string, number> = {};
        (data || []).forEach((r) => {
            counts[r.choice] = (counts[r.choice] || 0) + 1;
        });

        const total = data?.length || 0;
        const resultsWithPercent = Object.entries(counts).map(([choice, count]) => ({
            choice,
            count,
            percent: total > 0 ? Math.round((count / total) * 100) : 0,
        }));

        setResults(resultsWithPercent);
    };

    // 단일 선택
    const handleSelectSingle = async (choice: "살" | "말") => {
        await saveVote(choice);
        await fetchResults();
        setShowResult(true);
    };

    const handleSelectMulti = (idx: number) => setSelected(idx);

    const submitMultiVote = async () => {
        if (selected === null) return;
        await saveVote(selected);
        await fetchResults();
        setShowResult(true);
    };

    const nextVote = () => {
        setSelected(null);
        setShowResult(false);
        if (current + 1 < votes.length) setCurrent(current + 1);
        else setCurrent(-1);
    };

    // 삭제 팝업
    const deleteVote = (voteId: string) => {
        Alert.alert("삭제 확인", "정말 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            {
                text: "삭제",
                style: "destructive",
                onPress: async () => {
                    const { error } = await supabase
                        .from("votes")
                        .delete()
                        .eq("id", voteId);
                    if (error) console.error(error);
                    else fetchVotes();
                },
            },
        ]);
    };

    if (loading)
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.emptyText}>Loading...</Text>
            </SafeAreaView>
        );

    if (current === -1 || votes.length === 0)
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.logo}>votes</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>모든 투표가 끝났습니다.</Text>
                    <TouchableOpacity
                        style={styles.addbutton}
                        onPress={() => router.push("/add-vote")}
                    >
                        <Text style={styles.addtext}>add</Text>
                        <Ionicons name="add" size={20} color="#9c7866" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );

    const vote = votes[current];
    const options = vote.images ?? [];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>votes</Text>
            </View>

            {/* 삭제 버튼 (본인 작성글만) */}
            {currentUserId === vote.user_id && (
                <TouchableOpacity
                    style={{ position: "absolute", top: 50, right: 20 }}
                    onPress={() => deleteVote(vote.id)}
                >
                    <FontAwesome6 name="trash" size={25} color="#f0f0e5" />
                </TouchableOpacity>
            )}

            <View style={styles.voteBox}>
                {options.length === 1 ? (
                    <Text style={styles.guideText}>살까? 말까?</Text>
                ) : (
                    <Text style={styles.guideText}>둘 중 골라줘</Text>
                )}

                <Text style={styles.voteContent}>{vote.content}</Text>

                {/* 작성자 정보 */}
                <View style={{ flexDirection: "row", gap: 5, marginTop: 5, alignItems: 'center' }}>
                    <Text style={styles.time}>{getAgeGroup(vote.profiles?.birth_year)}</Text>
                    <Text style={styles.time}>|</Text>
                    <Text style={styles.time}>{vote.profiles?.gender || "성별 없음"}</Text>
                </View>

                {!showResult ? (
                    options.length === 1 ? (
                        <View style={styles.singleOptionContainer}>
                            <Image source={{ uri: options[0] }} style={styles.singleImage} />
                            <View style={styles.singleButtons}>
                                <TouchableOpacity
                                    style={styles.singleButton}
                                    onPress={() => handleSelectSingle("살")}
                                >
                                    <Text style={styles.singleButtonText}>살</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.singleButton}
                                    onPress={() => handleSelectSingle("말")}
                                >
                                    <Text style={styles.singleButtonText}>말</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.optionContainer}>
                            <View style={styles.options}>
                                {options.map((img: string, idx: number) => (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => handleSelectMulti(idx)}
                                        style={[
                                            styles.voteOption,
                                            selected === idx && styles.voteOptionSelected,
                                        ]}
                                    >
                                        <Image source={{ uri: img }} style={styles.voteImage} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={submitMultiVote}
                            >
                                <Text style={styles.submitText}>투표하기</Text>
                            </TouchableOpacity>
                        </View>
                    )
                ) : (
                    <View style={styles.optionContainer}>
                        <Text style={styles.guideText}>투표 결과</Text>
                        {results.map((r, idx) => (
                            <View key={idx} style={{ width: "100%", marginVertical: 5 }}>
                                <Text style={styles.voteContent}>
                                    {`${r.choice}: ${r.count}표 (${r.percent}%)`}
                                </Text>
                                <View style={styles.progressBarBackground}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            { width: `${r.percent}%` },
                                        ]}
                                    />
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={nextVote}
                        >
                            <Text style={styles.submitText}>다음</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={styles.addbutton}
                onPress={() => router.push("/add-vote")}
            >
                <Text style={styles.addtext}>add</Text>
                <Ionicons name="add" size={20} color="#9c7866" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#9c7866" },
    emptyContainer: { margin: 'auto' },
    header: { margin: 30, marginBottom: 10 },
    logo: { color: "#f0f0e5", fontSize: 30, fontWeight: "bold" },
    emptyText: { color: "#f0f0e5", fontSize: 18, textAlign: "center", marginTop: 50 },
    addbutton: {
        flexDirection: "row",
        position: "absolute",
        bottom: 40,
        alignSelf: "center",
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#f0f0e5",
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        gap: 5,
    },
    addtext: { fontSize: 20, color: "#9c7866" },
    voteBox: { marginTop: 30, alignItems: "center", justifyContent: "center", gap: 20, width: "100%", paddingHorizontal: 20 },
    guideText: { color: "#f0f0e5", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
    voteContent: { color: "#f0f0e5", fontSize: 20 },
    optionContainer: { flexDirection: "column", marginHorizontal: 30, alignItems: "center", width: "100%" },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
    voteOption: { alignItems: "center", borderWidth: 2, borderColor: "transparent", borderRadius: 10, padding: 5 },
    voteOptionSelected: { borderColor: "#f0f0e5" },
    voteImage: { width: 150, height: 150, borderRadius: 10 },
    submitButton: { marginTop: 10, backgroundColor: "rgba(240, 240, 229, 0.3)", padding: 10, borderRadius: 30, alignItems: "center" },
    submitText: { color: "#f0f0e5", fontWeight: "bold", fontSize: 20 },
    singleOptionContainer: { alignItems: "center" },
    singleImage: { width: 250, height: 250, borderRadius: 10, marginBottom: 20 },
    singleButtons: { flexDirection: "row", justifyContent: "space-around", gap: 10, width: "70%" },
    singleButton: { backgroundColor: "rgba(240, 240, 229, 0.3)", padding: 10, borderRadius: 30, width: "45%", alignItems: "center" },
    singleButtonText: { color: "#f0f0e5", fontWeight: "bold", fontSize: 20 },
    progressBarBackground: { height: 20, backgroundColor: "rgba(240,240,229,0.3)", borderRadius: 10, overflow: "hidden", marginTop: 5 },
    progressBarFill: { height: "100%", backgroundColor: "#f0f0e5", borderRadius: 10 },
    time: { color: "#f0f0e5", fontSize: 14 }
});
