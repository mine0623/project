import React, { useState } from "react";
import { router } from "expo-router";
import { SafeAreaView, View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Image } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';

export default function AddPost() {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [images, setImages] = useState<string[]>([]);

    const tags = ["추천", "질문"];

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const pickImage = async () => {
        const remaining = 5 - images.length;
        if (remaining <= 0) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 1,
        });

        if (!result.canceled) {
            const newImages = result.assets.map(asset => asset.uri);
            setImages(prev => [...prev, ...newImages]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <AntDesign name="close" size={30} color="#f0f0e5" />
                </TouchableOpacity>
            </View>
            <View style={styles.main}>
                <TextInput
                    style={styles.title}
                    placeholder="제목을 입력해주세요"
                />
                <TextInput
                    style={styles.text}
                    placeholder="자유롭게 내용을 작성해 주세요."
                    multiline
                />
                <View style={styles.tags}>
                    {tags.map(tag => {
                        const selected = selectedTags.includes(tag);
                        return (
                            <TouchableOpacity
                                key={tag}
                                style={[
                                    styles.tag,
                                    selected && styles.tagSelected
                                ]}
                                onPress={() => toggleTag(tag)}
                            >
                                <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                                    #{tag}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {images.length < 5 && (
                    <TouchableOpacity style={styles.box} onPress={pickImage}>
                        <Text>image</Text>
                    </TouchableOpacity>
                )}
            </View>
            <ScrollView
                style={styles.imgs}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
            >
                {images.map((uri, index) => (
                    <TouchableOpacity key={index} onPress={() => removeImage(index)}>
                        <Image source={{ uri }} style={styles.img} />
                    </TouchableOpacity>
                ))}
            </ScrollView>




        </SafeAreaView>
    )
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
    main: {
        marginTop: 20,
        gap: 10,
        marginHorizontal: 25,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f0f0e5',
        borderBottomWidth: 1,
        paddingBottom: 10,
        borderColor: 'rgba(240, 240, 229, 0.5)'
    },
    text: {
        height: 120,
        padding: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(240, 240, 230, 0.1)',
        color: '#f0f0e5',
        fontSize: 18,
    },
    tags: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center'
    },
    tag: {
        backgroundColor: 'rgba(183, 170, 147, 0.5)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    tagSelected: {
        backgroundColor: "#f0f0e5"
    },
    tagText: {
        color: "#f0f0e5",
        fontWeight: "bold"
    },
    tagTextSelected: {
        color: "#b7aa93"
    },

    imgs: {
        marginHorizontal: 25,
        marginTop: 20,
        gap: 8,
    },
    img: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    box: {
        marginTop: 20,
        backgroundColor: 'rgba(240, 240, 229, 0.3)',
        width: 80,
        height: 80,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
})