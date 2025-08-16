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

export default function VoteRandom() {

    return (

        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>mine</Text>
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
        margin: 30,
        marginBottom: 10
    },
    logo: {
        color: "#f0f0e5",
        fontSize: 30,
        fontWeight: "bold"
    },
    title: {
        color: "#f0f0e5",
        fontWeight: "bold",
        fontSize: 25,
        marginHorizontal: 'auto'
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
        backgroundColor: "rgba(240, 240, 229, 0.5)",
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
    voteContent: {
        color: "#f0f0e5",
        fontSize: 20,
        textAlign: "center"
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
