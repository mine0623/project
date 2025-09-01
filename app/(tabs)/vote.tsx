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

        // ✅ 내가 이미 투표한 항목들 가져오기
        const { data: myVotes, error: myVotesError } = await supabase
            .from("vote_results")
            .select("vote_id")
            .eq("user_id", user.id);

        if (myVotesError) console.error(myVotesError);

        const votedIds = myVotes?.map(v => v.vote_id) || [];

        // ✅ 이미 투표한 항목은 제외하고 불러오기
        const { data: votesData, error: votesError } = await supabase
            .from("votes")
            .select("*")
            .neq("user_id", user.id) // 내가 만든 투표 제외
            .not("id", "in", `(${votedIds.join(",")})`) // 이미 투표한 항목 제외
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
                user_id: user.id,
            },
        ]);
        if (error) console.error(error);
    };

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

    // 단일 선택 (살/말)
    const handleSelectSingle = async (choice: "살" | "말") => {
        await saveVote(choice);      // 투표 저장
        await fetchResults();        // 결과 불러오기
        setShowResult(true);         // 결과 표시
    };

    // 다중 선택 (A/B)
    const handleSelectMulti = async (idx: number) => {
        setSelected(idx);            // 선택 강조
        await saveVote(idx);         // 투표 저장
        await fetchResults();        // 결과 불러오기
        setShowResult(true);         // 결과 표시
    };


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

            <View style={styles.voteBox}>
                <Text style={styles.guideText}>
                    {options.length === 1 ? "살까? 말까?" : "둘 중 골라줘"}
                </Text>

                <View style={styles.info}>
                    <Text style={styles.time}>{getAgeGroup(vote.profiles?.birth_year)}</Text>
                    <Text style={styles.time}>|</Text>
                    <Text style={styles.time}>{vote.profiles?.gender || "성별 없음"}</Text>
                </View>


                <Text style={styles.voteContent}>{vote.content}</Text>

                <View style={styles.optionContainer}>
                    <View style={styles.images}>
                        {options.map((img: string, idx: number) => (
                            <Image
                                key={idx}
                                source={{ uri: img }}
                                style={options.length === 1 ? styles.singleImage : styles.voteImage}
                            />
                        ))}
                    </View>

                    {!showResult && (
                        <View style={options.length === 1 ? styles.singleButtons : styles.multiButtons}>
                            {options.length === 1 ? (
                                <>
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
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.singleButton, selected === 0 && styles.voteOptionSelected]}
                                        onPress={() => handleSelectMulti(0)}
                                    >
                                        <Text style={styles.singleButtonText}>A</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.singleButton, selected === 1 && styles.voteOptionSelected]}
                                        onPress={() => handleSelectMulti(1)}
                                    >
                                        <Text style={styles.singleButtonText}>B</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                </View>

                {showResult && (
                    <View style={{ marginTop: 10 }}>
                        <View style={{
                            flexDirection: "row",
                            borderRadius: 15,
                            overflow: "hidden",
                            backgroundColor: "rgba(240,240,229,0.3)"
                        }}>
                            {results.map((r, idx) => (
                                <View
                                    key={idx}
                                    style={{
                                        flex: r.count,
                                        backgroundColor:
                                            idx === 0 ? "#f0f0e5" : "#b7aa93",
                                    }}
                                />
                            ))}
                        </View>


                        <View style={{ marginTop: 8 }}>
                            {results.map((r, idx) => (
                                <Text key={idx} style={styles.voteContent}>
                                    {`${r.choice}: ${r.count}표 (${r.percent}%)`}
                                </Text>
                            ))}
                        </View>

                        <TouchableOpacity onPress={nextVote}>
                            <Text style={styles.button}>다음</Text>
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
    logo: { color: "#f0f0e5", fontSize: 30, fontWeight: "bold", letterSpacing: 1 },
    emptyText: { color: "#f0f0e5", fontSize: 18, textAlign: "center", marginTop: 50, letterSpacing: 1 },
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
    addtext: { fontSize: 20, color: "#9c7866", letterSpacing: 1 },

    guideText: {
        backgroundColor: 'rgba(240, 240, 229, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        color: '#f0f0e5',
        fontSize: 20,
    },
    voteBox: { alignItems: "center", justifyContent: "center", paddingHorizontal: 20, },
    voteContent: { color: "#f0f0e5", fontSize: 25, fontWeight: 'bold', },
    optionContainer: { flexDirection: "column", alignItems: "center", width: "100%" },
    options: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
    voteOption: { alignItems: "center", borderWidth: 1, borderColor: "transparent", borderRadius: 10, padding: 5 },
    voteOptionSelected: { borderColor: "#f0f0e5" },
    voteImage: { width: 150, height: 150, borderRadius: 10, },
    images: {
        flexDirection: 'row',
        gap: 12,
    },
    singleOptionContainer: { alignItems: "center" },
    singleImage: { width: 250, height: 250, borderRadius: 10, },
    singleButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
        gap: 10,
        width: "70%"
    },
    multiButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
        gap: 10,
        width: "70%"
    },
    singleButton: { backgroundColor: "rgba(240, 240, 229, 0.3)", padding: 10, borderRadius: 30, width: "45%", alignItems: "center" },
    singleButtonText: { color: "#f0f0e5", fontWeight: "bold", fontSize: 20, letterSpacing: 1 },
    time: { color: "#f0f0e5", fontSize: 14, letterSpacing: 1 },
    info: { flexDirection: "row", gap: 5, alignItems: 'center' , marginVertical: 10},

    result: {
        flexDirection: 'column',
        marginHorizontal: 20,
    },
    resultTexts: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    resultText: {
        color: '#f0f0e5',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    button: {
        color: '#9c7866',
        fontSize: 18,
        fontWeight: 'bold',
        borderRadius: 20,
        backgroundColor: '#f0f0e5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        textAlign: 'center',
        marginVertical: 20,
        letterSpacing: 1,
    },
});
