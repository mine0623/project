import React, { useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileSettings() {
    const [selectedTab, setSelectedTab] = useState("전체");

    const tabs = ["전체", "추천", "질문"];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>mine</Text>
                <TouchableOpacity>
                    <Ionicons name="search" size={25} color="#f0f0e5" />
                </TouchableOpacity>
            </View>


            <View style={styles.tabContainer}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles.tabButton,
                            selectedTab === tab && styles.tabButtonSelected,
                        ]}
                        onPress={() => setSelectedTab(tab)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                selectedTab === tab && styles.tabTextSelected,
                            ]}
                        >
                            {tab === "전체" ? tab : `#${tab}`}
                        </Text>

                    </TouchableOpacity>
                ))}
            </View>

            {/* 탭별 콘텐츠 */}
            <View style={styles.contentContainer}>
                {selectedTab === "전체" && <Text style={styles.contentText}>전체 내용</Text>}
                {selectedTab === "추천" && <Text style={styles.contentText}>추천 내용</Text>}
                {selectedTab === "질문" && <Text style={styles.contentText}>질문 내용</Text>}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#9c7866",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        margin: 30,
    },
    logo: {
        color: "#f0f0e5",
        fontSize: 30,
        fontWeight: "bold",
    },
    tabContainer: {
        flexDirection: "row",
        justifyContent: 'flex-start',
        gap: 10,
        marginLeft: 25
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f0f0e5',
    },
    tabButtonSelected: {
        backgroundColor: "#f0f0e5",
    },
    tabText: {
        color: '#f0f0e5',
    },
    tabTextSelected: {
        color: "#9c7866",
        fontWeight: 'bold'
    },
    contentContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    contentText: {
        fontSize: 20,
        color: "#f0f0e5",
    },
});
