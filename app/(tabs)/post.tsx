import React, { useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function ProfileSettings() {
    const [selectedTab, setSelectedTab] = useState("전체");
    const tabs = ["전체", "추천", "질문"];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>mine</Text>
                <TouchableOpacity onPress={() => router.push('/search')}>
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

            <View>
                {selectedTab === "전체" &&
                    <>
                        <View style={styles.post}>
                            <View>
                                <View style={styles.postHeader}>
                                    <TouchableOpacity style={styles.profile}>
                                        <Ionicons name="person-circle-sharp" size={35} color="#b7aa93" />
                                        <Text style={styles.name}>안미네미네짱</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.time}>1시간 전</Text>
                                </View>
                                <View style={styles.tool}>
                                    <View style={styles.articles}>
                                        <Text style={styles.title}>주말에 데이트..</Text>
                                        <Text style={styles.text}>뭐 입을까요? 심플하고 이쁜고</Text>
                                        <View style={styles.tags}>
                                            <Text style={styles.tag}>#질문</Text>
                                            <Text style={styles.tag}>#추천</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.icons}>
                                <View style={styles.icon}>
                                    <TouchableOpacity>
                                        <Ionicons name="heart" size={27} color="#e5c1bd" />
                                    </TouchableOpacity>
                                    <Text style={styles.count}>10</Text>
                                </View>
                                <View style={styles.icon}>
                                    <TouchableOpacity>
                                        <Ionicons name="chatbox" size={27} color="#dfc8ba" />
                                    </TouchableOpacity>
                                    <Text style={styles.count}>5</Text>
                                </View>
                            </View>
                            <View style={styles.underline}></View>
                        </View>

                        <View style={styles.post}>
                            <View>
                                <View style={styles.postHeader}>
                                    <TouchableOpacity style={styles.profile}>
                                        <Ionicons name="person-circle-sharp" size={35} color="#bcb8b1" />
                                        <Text style={styles.name}>안미네미네짱</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.time}>1시간 전</Text>
                                </View>
                                <View style={styles.tool}>
                                    <View style={styles.articles}>
                                        <Text style={styles.title}>주말에 데이트..</Text>
                                        <Text style={styles.text}>이 조합들</Text>
                                        <View style={styles.tags}>
                                            <Text style={styles.tag}>#질문</Text>
                                        </View>
                                    </View>
                                    <View style={styles.img}></View>
                                </View>
                            </View>
                            <View style={styles.icons}>
                                <View style={styles.icon}>
                                    <TouchableOpacity>
                                        <Ionicons name="heart" size={27} color="#e5c1bd" />
                                    </TouchableOpacity>
                                    <Text style={styles.count}>10</Text>
                                </View>
                                <View style={styles.icon}>
                                    <TouchableOpacity>
                                        <Ionicons name="chatbox" size={27} color="#dfc8ba" />
                                    </TouchableOpacity>
                                    <Text style={styles.count}>5</Text>
                                </View>
                            </View>
                            <View style={styles.underline}></View>
                        </View>
                    </>
                }
                {selectedTab === "추천" &&
                    <>
                    </>
                }
                {selectedTab === "질문" &&
                    <>
                    </>
                }
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
    post: {
        marginTop: 25,
        flexDirection: 'column'
    },
    tool: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
    },
    img: {
        width: 80,
        height: 80,
        backgroundColor: '#bda08b',
        borderRadius: 8,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    time: {
        color: 'rgba(240, 240, 229, 0.5)'
    },
    articles: {
        gap: 5,
    },
    profile: {
        marginLeft: 20,
        flexDirection: 'row',
        gap: 5,
        alignItems: 'center',
        marginBottom: 5,
    },
    name: {
        fontSize: 20,
        color: '#f0f0e5',
        fontWeight: 'bold'
    },
    title: {
        color: '#f0f0e5',
        fontSize: 18,
        fontWeight: 'bold'
    },
    text: {
        color: '#f0f0e5',
        fontSize: 18,
    },
    icons: {
        marginHorizontal: 20,
        marginTop: 10,
        flexDirection: 'row',
        gap: 10,
    },
    icon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    count: {
        fontSize: 15,
        color: '#f0f0e5'
    },
    tags: {
        marginTop: 5,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center'
    },
    tag: {
        backgroundColor: '#bda08b',
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: '#f0f0e5',
        borderRadius: 20,
    },
    underline: {
        marginTop: 25,
        borderBottomWidth: 1,
        borderColor: 'rgba(240, 240, 229, 0.5)'
    },
});
