import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StyleSheet,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function Vote() {
    const router = useRouter();
    const [vote, setVote] = useState<any | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRandomVote = async () => {
        setLoading(true);
        setSelected(null);
        const { data, error } = await supabase
            .from("votes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) console.error(error);
        else if (data && data.length > 0) {
            const random = data[Math.floor(Math.random() * data.length)];
            setVote(random);
        } else setVote(null);

        setLoading(false);
    };

    useEffect(() => {
        fetchRandomVote();
    }, []);

    const handleSelectSingle = (choice: "살" | "말") => {
        console.log("선택:", choice);
        fetchRandomVote(); // 다음 투표 불러오기
    };

    const handleSelectMulti = (idx: number) => {
        setSelected(idx);
    };

    const submitMultiVote = () => {
        if (selected === null) return;
        console.log("선택 idx:", selected);
        fetchRandomVote(); // 다음 투표 불러오기
    };

    if (loading) return <SafeAreaView style={styles.container}><Text style={styles.emptyText}>Loading...</Text></SafeAreaView>;
    if (!vote) return <SafeAreaView style={styles.container}><Text style={styles.emptyText}>투표가 없습니다!</Text></SafeAreaView>;

    const options = vote.images ?? [];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>votes</Text>
            </View>
            <View style={styles.voteBox}>
                {options.length === 1 ? (
                    <Text style={styles.guideText}>살까? 말까?</Text>
                ) : (
                    <Text style={styles.guideText}>둘 중 골라줘</Text>
                )}

                <Text style={styles.voteContent}>{vote.content}</Text>

                {options.length === 1 ? (
                    <View style={styles.singleOptionContainer}>
                        <Image source={{ uri: options[0] }} style={styles.singleImage} />
                        <View style={styles.singleButtons}>
                            <TouchableOpacity style={styles.singleButton} onPress={() => handleSelectSingle("살")}>
                                <Text style={styles.singleButtonText}>살</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.singleButton} onPress={() => handleSelectSingle("말")}>
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
                                    style={[styles.voteOption, selected === idx && styles.voteOptionSelected]}
                                >
                                    <Image source={{ uri: img }} style={styles.voteImage} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.submitButton} onPress={submitMultiVote}>
                            <Text style={styles.submitText}>next</Text>
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
    container: {
        flex: 1,
        backgroundColor: "#9c7866",
    },
    header: {
        margin: 30,
        marginBottom: 10
    },
    logo: {
        color: "#f0f0e5",
        fontSize: 30,
        fontWeight: "bold"
    },
    emptyText: {
        color: "#f0f0e5",
        fontSize: 18,
        textAlign: "center",
        marginTop: 50
    },
    addbutton: {
        flexDirection: 'row',
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
    addtext: {
        fontSize: 20,
        color: "#9c7866",
    },
    voteBox: {
        marginTop: 30,
        alignItems: "center",
        justifyContent: 'center',
        gap: 20,
    },
    guideText: {
        color: "#f0f0e5",
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 10,
    },

    voteContent: {
        color: "#f0f0e5",
        fontSize: 20,

    },
    optionContainer: {
        flexDirection: "column",
        marginHorizontal: 30,
    },
    options: {
        flexDirection: 'row',
    },
    voteOption: {
        alignItems: "center",
        borderWidth: 2,
        borderColor: "transparent",
        borderRadius: 10,
        padding: 5
    },
    voteOptionSelected: {
        borderColor: "#f0f0e5"
    },
    voteImage: {
        width: 150,
        height: 150,
        borderRadius: 10
    },
    optionLabel: {
        color: "#f0f0e5",
        marginTop: 5,
        fontWeight: "bold",
        fontSize: 16
    },
    submitButton: {
        marginTop: 10,
        backgroundColor: "rgba(240, 240, 229, 0.3)",
        padding: 10,
        borderRadius: 30,
        alignItems: 'center'
    },
    submitText: {
        color: "#f0f0e5",
        fontWeight: "bold",
        fontSize: 20,
    },
    singleOptionContainer: {
        alignItems: "center"
    },
    singleImage: {
        width: 250,
        height: 250,
        borderRadius: 10,
        marginBottom: 20
    },
    singleButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
        gap: 10,
        width: '70%',
    },
    singleButton: {
        backgroundColor: "rgba(240, 240, 229, 0.3)",
        padding: 10,
        borderRadius: 30,
        width: "45%",
        alignItems: "center",
    },
    singleButtonText: {
        color: "#f0f0e5",
        fontWeight: "bold",
        fontSize: 20,
    },
});
