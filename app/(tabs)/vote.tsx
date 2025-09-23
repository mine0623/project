import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Image,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Vote {
    id: string;
    user_id: string;
    first_choice_wish_id: string | null;
    first_choice_content: string;
    second_choice_wish_id: string | null;
    second_choice_content: string | null;
    created_at: string | null;
}

interface WishInfo {
    name: string;
    price: string | number;
}

export default function VoteViewer() {
    const [votes, setVotes] = useState<Vote[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const [results, setResults] = useState<{ first: number; second: number }>({
        first: 0,
        second: 0,
    });
    const [hasVoted, setHasVoted] = useState(false);
    const [wishImages, setWishImages] = useState<{ [key: string]: string }>({});
    const [wishInfos, setWishInfos] = useState<{ [wishId: string]: WishInfo }>({});
    const router = useRouter();

    useEffect(() => {
        getUser();
    }, []);

    useEffect(() => {
        if (userId) fetchVotes();
    }, [userId]);

    useEffect(() => {
        if (!votes[currentIndex]) return;
        const { first_choice_wish_id, second_choice_wish_id } = votes[currentIndex];

        if (first_choice_wish_id && !wishImages[first_choice_wish_id])
            fetchWishImage(first_choice_wish_id);
        if (second_choice_wish_id && !wishImages[second_choice_wish_id])
            fetchWishImage(second_choice_wish_id);
    }, [currentIndex, votes]);

    useEffect(() => {
        const vote = votes[currentIndex];
        if (!vote) return;

        if (vote.first_choice_wish_id && !wishInfos[vote.first_choice_wish_id])
            fetchWishInfo(vote.first_choice_wish_id);
        if (vote.second_choice_wish_id && !wishInfos[vote.second_choice_wish_id])
            fetchWishInfo(vote.second_choice_wish_id);
    }, [currentIndex, votes]);

    const getUser = async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            console.error(error);
            Alert.alert("로그인 오류", "유저 정보를 불러올 수 없습니다.");
        } else if (data?.user) {
            setUserId(data.user.id);
        }
    };

    const fetchVotes = async () => {
        if (!userId) return;

        const { data: myResponses, error: responsesError } = await supabase
            .from("vote_responses")
            .select("vote_id")
            .eq("user_id", userId);

        if (responsesError) {
            Alert.alert("Error", responsesError.message);
            return;
        }

        const votedIds = myResponses?.map((r) => r.vote_id) || [];

        const { data, error } = await supabase
            .from("votes")
            .select("*")
            .neq("user_id", userId)
            .not("id", "in", `(${votedIds.join(",") || ""})`)
            .order("created_at", { ascending: true });

        if (error) {
            Alert.alert("Error", error.message);
        } else {
            setVotes(data);
            setCurrentIndex(0);
            setHasVoted(false);
            setResults({ first: 0, second: 0 });
        }
    };

    const fetchWishImage = async (wishId: string) => {

        const { data, error } = await supabase
            .from("wishlist")
            .select("id, image, name, price")
            .eq("id", wishId)
            .single();


        if (error) console.error("Wish Image Fetch Error:", error);
        else {
            console.log("Wish Image Data:", data);
            setWishImages((prev) => ({ ...prev, [wishId]: data.image }));
        }
    };

    const fetchWishInfo = async (wishId: string) => {
        if (!wishId) return;

        try {
            const { data, error } = await supabase
                .from("wishlist")
                .select("id, name, price")
                .eq("id", wishId)
                .single();

            if (error) throw error;

            if (data) {
                setWishInfos(prev => ({
                    ...prev,
                    [wishId]: { name: data.name, price: data.price }
                }));
            }
        } catch (err: any) {
            console.error("Wish Info Fetch Error:", err.message);
        }
    };

    const fetchResults = async (voteId: string) => {
        try {
            const { data, error } = await supabase
                .from("vote_responses")
                .select("choice")
                .eq("vote_id", voteId);

            if (error) throw error;

            let firstCount = 0;
            let secondCount = 0;

            const vote = votes[currentIndex];
            if (!vote) return;

            const isBuyOrNot = !vote.second_choice_content && !vote.second_choice_wish_id;

            data?.forEach((r: any) => {
                if (isBuyOrNot) {
                    if (r.choice === "살까") firstCount++;
                    else if (r.choice === "말까") secondCount++;
                } else {
                    if (r.choice === "A") firstCount++;
                    else if (r.choice === "B") secondCount++;
                }
            });

            setResults({ first: firstCount, second: secondCount });
        } catch (err: any) {
            console.error("fetchResults 오류:", err.message);
        }
    };


    const getTitle = (vote: Vote) => {
        const secondEmpty =
            !vote.second_choice_content && !vote.second_choice_wish_id;
        return secondEmpty ? "살까? 말까?" : "둘 중 골라줘";
    };

    const handleNext = () => {
        if (currentIndex < votes.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setHasVoted(false);
            setResults({ first: 0, second: 0 });
        } else {
            setVotes([]);
        }
    };

    const handleChoice = async (choice: "first" | "second") => {
        const vote = votes[currentIndex];
        if (!vote || !userId)
            return Alert.alert("로그인 필요", "투표하려면 로그인하세요.");

        let choiceValue: string | null = null;
        const isBuyOrNot = getTitle(vote) === "살까? 말까?";

        if (isBuyOrNot) {
            choiceValue = choice === "first" ? "살까" : "말까";
        } else {
            choiceValue = choice === "first" ? "A" : "B";
        }

        try {
            const { error } = await supabase.from("vote_responses").insert([
                {
                    vote_id: vote.id,
                    user_id: userId,
                    choice: choiceValue
                },
            ]);

            if (error) throw error;
            await fetchResults(vote.id);
            setHasVoted(true);
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    if (votes.length === 0)
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.logo}>vote</Text>
                </View>

                <View style={[styles.main, { flex: 1, justifyContent: "center", gap: 3 }]}>
                    <Text style={styles.text}>모든 투표가 끝났습니다.</Text>
                </View>

                <TouchableOpacity
                    style={styles.floatingTextButton}
                    onPress={() => router.push("/add-vote")}
                >
                    <Text style={styles.floatingText}>vote</Text>
                    <Ionicons name="add" size={15} color="#9c7866" />
                </TouchableOpacity>
            </SafeAreaView>
        );

    const vote = votes[currentIndex];
    const isBuyOrNot = getTitle(vote) === "살까? 말까?";
    const hasSecondChoice =
        isBuyOrNot || vote.second_choice_content || vote.second_choice_wish_id;

    const totalVotes = results.first + results.second || 1;
    const firstPercent = Math.round((results.first / totalVotes) * 100);
    const secondPercent = Math.round((results.second / totalVotes) * 100);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>vote</Text>
            </View>

            <ScrollView contentContainerStyle={styles.main}>
                <Text style={styles.title}>{getTitle(vote)}</Text>

                <View
                    style={[
                        styles.boxContainer,
                        !hasSecondChoice && { justifyContent: "center" },
                    ]}
                >
                    {[vote.first_choice_content, vote.second_choice_content].map(
                        (_, idx) => {
                            const isFirst = idx === 0;
                            const content = isFirst
                                ? vote.first_choice_content
                                : vote.second_choice_content;
                            const wishId = isFirst
                                ? vote.first_choice_wish_id
                                : vote.second_choice_wish_id;
                            const percent = isFirst ? firstPercent : secondPercent;
                            if (isBuyOrNot && !isFirst) return null;
                            const info = wishId ? wishInfos[wishId] : null;
                            return (
                                <View
                                    key={idx}
                                    style={[
                                        styles.voteBox,
                                        !hasSecondChoice && { width: 300, height: 200 },
                                    ]}
                                >
                                    {wishId && wishImages[wishId] && (
                                        <Image
                                            source={{ uri: wishImages[wishId] }}
                                            style={{
                                                width: 150,
                                                height: 150,
                                                borderRadius: 10,
                                                marginBottom: 10,
                                            }}
                                        />
                                    )}
                                    {info && (
                                        <>
                                            <View style={{gap: 5}}>
                                                <Text
                                                    style={styles.info}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {info.name}
                                                </Text>
                                                <Text style={styles.info}>{info.price}원</Text>
                                            </View>
                                        </>
                                    )}
                                    <Text style={styles.text}>{content}</Text>
                                </View>
                            );
                        }
                    )}
                </View>

                <View style={styles.choiceContainer}>
                    <TouchableOpacity
                        style={styles.choiceBox}
                        onPress={() => !hasVoted && handleChoice("first")}
                    >
                        <Text style={styles.choiceText}>
                            {hasVoted
                                ? `${firstPercent}% (${results.first}표)`
                                : isBuyOrNot
                                    ? "살까?"
                                    : "A"}
                        </Text>
                    </TouchableOpacity>

                    {hasSecondChoice && (
                        <TouchableOpacity
                            style={styles.choiceBox}
                            onPress={() => !hasVoted && handleChoice("second")}
                        >
                            <Text style={styles.choiceText}>
                                {hasVoted
                                    ? `${secondPercent}% (${results.second}표)`
                                    : isBuyOrNot
                                        ? "말까?"
                                        : "B"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {hasVoted && (
                    <TouchableOpacity style={styles.button} onPress={handleNext}>
                        <Text style={styles.buttonText}>Next Vote</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            <TouchableOpacity
                style={styles.floatingTextButton}
                onPress={() => router.push("/add-vote")}
            >
                <Text style={styles.floatingText}>vote</Text>
                <Ionicons name="add" size={15} color="#9c7866" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#9c7866", },
    header: { flexDirection: "column", justifyContent: "space-between", margin: 30, gap: 10, },
    logo: { color: "#f0f0e5", fontSize: 30, fontWeight: "bold" },
    main: { alignItems: "center", justifyContent: "center", paddingBottom: 80 },
    title: {
        color: "#9c7866",
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 10,
        backgroundColor: "#f0f0e5",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 30,
    },
    boxContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 15,
        marginVertical: 10,
    },
    voteBox: {
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
        borderRadius: 15,
        width: 150,
        height: 250,
    },
    info: {
        textAlign: "center",
        fontSize: 16,
        color: "#f0f0e5",
    },
    text: {
        textAlign: 'center',
        fontSize: 18,
        color: '#f0f0e5',
    },
    choiceContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 15,
    },
    choiceBox: {
        backgroundColor: "rgba(240, 240, 229, 0.2)",
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 15,
        width: 150,
        height: 80,
        alignItems: "center",
        justifyContent: "center",
    },
    choiceText: { fontSize: 18, fontWeight: "bold", color: "#f0f0e5" },
    button: {
        backgroundColor: "#f0f0e5",
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
        alignSelf: "center",
    },
    buttonText: { color: "#9c7866", fontWeight: "bold", textAlign: "center" },
    floatingTextButton: {
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
        gap: 3
    },
    floatingText: { fontSize: 16, color: "#9c7866" },
});
