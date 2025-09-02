import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Vote {
    id: string;
    user_id: string;
    first_choice_image: string | null;
    first_choice_wish_id: string | null;
    first_choice_content: string;
    second_choice_image: string | null;
    second_choice_wish_id: string | null;
    second_choice_content: string | null;
    created_at: string | null;
}

export default function VoteViewer() {
    const [votes, setVotes] = useState<Vote[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const router = useRouter();

    useEffect(() => {
        fetchVotes();
    }, []);

    const fetchVotes = async () => {
        const { data, error } = await supabase
            .from("votes")
            .select("*")
            .order("created_at", { ascending: true });

        if (error) {
            Alert.alert("Error", error.message);
        } else if (data) {
            setVotes(data);
        }
    };

    const getTitle = (vote: Vote) => {
        const secondEmpty =
            !vote.second_choice_content &&
            !vote.second_choice_image &&
            !vote.second_choice_wish_id;

        return secondEmpty ? "살까? 말까?" : "둘 중 골라줘";
    };

    const handleNext = () => {
        if (currentIndex < votes.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            Alert.alert("End", "더 이상 투표가 없습니다.");
        }
    };

    // 선택을 Supabase에 저장하는 함수
    const handleChoice = async (choice: "first" | "second") => {
        const vote = votes[currentIndex];
        const choiceContent =
            choice === "first" ? vote.first_choice_content : vote.second_choice_content;

        const { error } = await supabase
            .from("votes")
            .update({ user_choice: choiceContent })
            .eq("id", vote.id);

        if (error) {
            Alert.alert("Error", error.message);
        } else {
            Alert.alert("선택 완료", choiceContent || "");
            handleNext();
        }
    };

    if (votes.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>Loading votes...</Text>
            </SafeAreaView>
        );
    }

    const vote = votes[currentIndex];
    const hasSecondChoice =
        vote.second_choice_content || vote.second_choice_image || vote.second_choice_wish_id;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>vote</Text>
            </View>

            <ScrollView contentContainerStyle={styles.main}>
                <Text style={styles.title}>{getTitle(vote)}</Text>

                <View style={styles.boxContainer}>
                    {/* 첫 번째 선택지 */}
                    <View style={styles.voteBox}>
                        {vote.first_choice_image && (
                            <Image source={{ uri: vote.first_choice_image }} style={styles.image} />
                        )}
                        {vote.first_choice_wish_id && <Text>Wish ID: {vote.first_choice_wish_id}</Text>}
                        <Text style={styles.text}>{vote.first_choice_content}</Text>
                    </View>

                    {/* 두 번째 선택지 */}
                    {hasSecondChoice && (
                        <View style={styles.voteBox}>
                            {vote.second_choice_image && (
                                <Image source={{ uri: vote.second_choice_image }} style={styles.image} />
                            )}
                            {vote.second_choice_wish_id && <Text>Wish ID: {vote.second_choice_wish_id}</Text>}
                            <Text style={styles.text}>{vote.second_choice_content}</Text>
                        </View>
                    )}
                </View>

                {/* 선택지 버튼 */}
                <View style={styles.choiceContainer}>
                    <TouchableOpacity
                        style={styles.choiceBox}
                        onPress={() => handleChoice("first")}
                    >
                        <Text style={styles.choiceText}>
                            {getTitle(vote) === "살까? 말까?" ? "살" : "A"}
                        </Text>
                    </TouchableOpacity>

                    {hasSecondChoice && (
                        <TouchableOpacity
                            style={styles.choiceBox}
                            onPress={() => handleChoice("second")}
                        >
                            <Text style={styles.choiceText}>
                                {getTitle(vote) === "살까? 말까?" ? "말" : "B"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>Next Vote</Text>
            </TouchableOpacity>

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
    container: { flex: 1, backgroundColor: "#9c7866" },
    header: { flexDirection: "row", justifyContent: "space-between", margin: 30 },
    logo: { color: "#f0f0e5", fontSize: 30, fontWeight: "bold" },
    main: { alignItems: "center", paddingBottom: 80 },
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
    boxContainer: { flexDirection: "row", justifyContent: "center", gap: 15, marginVertical: 10 },
    voteBox: {
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
        borderRadius: 15,
        width: 150,
        height: 250,    
    },
    image: { width: 150, height: 150, marginVertical: 10, borderRadius: 10 },
    text: { textAlign: "center", fontSize: 18, color: "#f0f0e5", marginVertical: 10 },
    choiceContainer: { flexDirection: "row", justifyContent: "center", gap: 15, marginTop: 20 },
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
    button: { backgroundColor: "#9c7866", padding: 15, borderRadius: 10, marginTop: 15, alignSelf: "center" },
    buttonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
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
        gap: 5,
    },
    floatingText: { fontSize: 16, color: "#9c7866" },
});
