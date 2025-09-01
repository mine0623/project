import React, { useState, useEffect } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import PostCard from "@/app/(details)/postCard";

export default function PostList() {
  const [selectedTab, setSelectedTab] = useState("전체");
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortOption, setSortOption] = useState<"latest" | "popular">("latest");
  const router = useRouter();

  const tabs: string[] = ["전체", "이번 주 인기🔥", "이번 달 인기🔥"];

  useEffect(() => {
    getCurrentUser();
    fetchPosts();
  }, [selectedTab, sortOption]);

  const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setCurrentUser(data.user);
  };

  const fetchPosts = async () => {
    let query = supabase
      .from("posts")
      .select(`
        id,
        title,
        content,
        tags,
        images,
        created_at,
        profiles (
          id,
          name,
          gender,
          avatar_url,
          birth_year
        ),
        hearts (user_id),
        comments (id)
      `);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
      return;
    }

    let formatted = (data ?? []).map((post: any) => ({
      ...post,
      profiles: post.profiles ?? null,
      hearts: Array.isArray(post.hearts) ? post.hearts : [],
      comments: Array.isArray(post.comments) ? post.comments : [],
      images: Array.isArray(post.images) ? post.images : [],
    }));

    const now = new Date();
    if (selectedTab === "이번 주 인기🔥") {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      startOfWeek.setDate(now.getDate() - diff);
      startOfWeek.setHours(0, 0, 0, 0);

      formatted = formatted.filter(
        (post) => new Date(post.created_at) >= startOfWeek
      );
    } else if (selectedTab === "이번 달 인기🔥") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      formatted = formatted.filter(
        (post) => new Date(post.created_at) >= startOfMonth
      );
    }

    if (sortOption === "popular") {
      formatted = formatted.sort((a, b) => b.hearts.length - a.hearts.length);
    } else {
      formatted = formatted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    setPosts(formatted);
  };

  const handlePostPress = (post: any) => {
    router.push({
      pathname: "/postDetail",
      params: { post: JSON.stringify(post) },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>mine</Text>
        <TouchableOpacity onPress={() => router.push("/search")}>
          <Ionicons name="search" size={25} color="#f0f0e5" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, selectedTab === tab && styles.tabButtonSelected]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextSelected]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab === "전체" && (
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[styles.sortButton, sortOption === "latest" && styles.sortSelected]}
            onPress={() => setSortOption("latest")}
          >
            <Text style={[styles.sortText, sortOption === "latest" && styles.sortTextSelected]}>
              최신순
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortOption === "popular" && styles.sortSelected]}
            onPress={() => setSortOption("popular")}
          >
            <Text style={[styles.sortText, sortOption === "popular" && styles.sortTextSelected]}>
              인기순
            </Text>
          </TouchableOpacity>
        </View>
      )}


      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handlePostPress(item)}
            activeOpacity={0.8}
          >
            <PostCard post={item} currentUser={currentUser} />
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.floatingTextButton}
        onPress={() => router.push("/add-post")}
      >
        <Text style={styles.floatingText}>글쓰기</Text>
        <Ionicons name="pencil" size={15} color="#9c7866" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#9c7866" },
  header: { flexDirection: "row", justifyContent: "space-between", margin: 30, marginBottom: 10 },
  logo: { color: "#f0f0e5", fontSize: 30, fontWeight: "bold" },
  tabContainer: { flexDirection: "row", justifyContent: "flex-start", gap: 10, marginLeft: 20, marginTop: 10 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f0f0e5' },
  tabButtonSelected: { backgroundColor: "#f0f0e5" },
  tabText: { color: '#f0f0e5' },
  tabTextSelected: { color: "#9c7866", fontWeight: 'bold' },
  sortContainer: { flexDirection: "row", marginHorizontal: 20, marginVertical: 10, gap: 8, paddingVertical: 10, },
  sortButton: {},
  sortSelected: {},
  sortText: { color: "rgba(240, 240, 229, 0.5)", fontSize: 15, },
  sortTextSelected: { color: "#f0f0e5" },
  floatingTextButton: {
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
  floatingText: { fontSize: 16, color: "#9c7866" },
});
