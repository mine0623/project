import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function Post() {
  const [selectedTab, setSelectedTab] = useState("전체");
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortOption, setSortOption] = useState<"latest" | "popular">("latest");

  // 🔹 탭 고정
  const tabs: string[] = ["전체", "추천", "질문"];

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
        hearts (
          user_id
        ),
        comments (
          id
        )
      `);

    // 🔹 탭 필터
    if (selectedTab !== "전체") query = query.contains("tags", [selectedTab]);

    // 🔹 최신순 정렬
    if (sortOption === "latest") query = query.order("created_at", { ascending: false });

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
    }));

    // 🔹 인기순 정렬
    if (sortOption === "popular") {
      formatted = formatted.sort((a, b) => b.hearts.length - a.hearts.length);
    }

    setPosts(formatted);
  };

  const toggleHeart = async (postId: number) => {
    if (!currentUser) return;

    const updatedPosts = [...posts];
    const postIndex = updatedPosts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

    const post = updatedPosts[postIndex];
    const hasHeart = post.hearts.some((h: any) => h.user_id === currentUser.id);

    if (hasHeart) {
      post.hearts = post.hearts.filter((h: any) => h.user_id !== currentUser.id);
      await supabase.from("hearts").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    } else {
      post.hearts.push({ user_id: currentUser.id });
      await supabase.from("hearts").insert([{ post_id: postId, user_id: currentUser.id }]);
    }

    setPosts(updatedPosts);
  };

  const getAgeGroup = (birth_year: number | null) => {
    if (!birth_year) return "연령대 없음";
    const age = new Date().getFullYear() - birth_year;
    if (age < 10) return "10세 미만";
    const group = Math.floor(age / 10) * 10;
    return `${group}대`;
  };

  const renderPost = ({ item }: { item: any }) => {
    const profile = item.profiles;
    const hasHeart = currentUser ? item.hearts.some((h: any) => h.user_id === currentUser.id) : false;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: "/postDetail",
            params: { post: JSON.stringify(item) }
          })
        }
      >
        <View style={styles.post}>
          <View style={styles.postHeader}>
            <TouchableOpacity style={styles.profile}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <Ionicons name="person-circle-sharp" size={35} color="#b7aa93" />
              )}
              <Text style={styles.name}>{profile?.name || "익명"}</Text>
            </TouchableOpacity>

            <Text style={styles.time}>{getAgeGroup(profile?.birth_year)}</Text>
            <Text style={styles.time}>|</Text>
            <Text style={styles.time}>{profile?.gender || "성별 없음"}</Text>
            <Text style={styles.time}>|</Text>
            <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
          </View>

          <View style={styles.tool}>
            <View style={styles.main}>
              <View style={styles.articles}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.text}>{item.content}</Text>
              </View>
              {item.images?.length > 0 ? (
                <Image source={{ uri: Array.isArray(item.images) ? item.images[0] : item.images }} style={styles.img} resizeMode="cover" />
              ) : (
                <View style={styles.img}>
                  <Ionicons name="image-outline" size={40} color="#f0f0e5" />
                </View>
              )}
            </View>

            <View style={styles.tags}>
              {item.tags?.map((tag: string, index: number) => (
                <Text key={index} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.icons}>
            <View style={styles.icon}>
              <TouchableOpacity onPress={() => toggleHeart(item.id)}>
                <Ionicons
                  name="heart"
                  size={27}
                  color={hasHeart ? "#e5c1bd" : "rgba(240, 240, 229, 0.2)"}
                />
              </TouchableOpacity>
              <Text style={styles.count}>{item.hearts.length}</Text>
            </View>
            <View style={styles.icon}>
              <Ionicons name="chatbox" size={27} color="#dfc8ba" />
              <Text style={styles.count}>{item.comments.length}</Text>
            </View>
          </View>

          <View style={styles.underline}></View>
        </View>
      </TouchableOpacity>
    );
  };

  const timeAgo = (date: string) => {
    const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>mine</Text>
        <TouchableOpacity onPress={() => router.push("/search")}>
          <Ionicons name="search" size={25} color="#f0f0e5" />
        </TouchableOpacity>
      </View>

      {/* 🔹 고정 탭 */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, selectedTab === tab && styles.tabButtonSelected]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextSelected]}>
              {tab === "전체" ? tab : `#${tab}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 정렬 */}
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

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.floatingTextButton} onPress={() => router.push("/add-post")}>
        <Text style={styles.floatingText}>글쓰기</Text>
        <Ionicons name="pencil" size={15} color="#9c7866" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// 스타일은 그대로
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#9c7866" },
  header: { flexDirection: "row", justifyContent: "space-between", margin: 30 },
  logo: { color: "#f0f0e5", fontSize: 30, fontWeight: "bold" },
  tabContainer: { flexDirection: "row", justifyContent: "flex-start", gap: 10, marginLeft: 25 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f0f0e5' },
  tabButtonSelected: { backgroundColor: "#f0f0e5" },
  tabText: { color: '#f0f0e5' },
  tabTextSelected: { color: "#9c7866", fontWeight: 'bold' },
  sortContainer: { flexDirection: "row", marginHorizontal: 30, marginTop: 20, marginBottom: 10, gap: 8 },
  sortButton: {},
  sortSelected: {},
  sortText: { color: "rgba(240, 240, 229, 0.5)" },
  sortTextSelected: { color: "#f0f0e5" },
  avatar: { width: 35, height: 35, borderRadius: 50 },
  post: { marginTop: 25, flexDirection: 'column' },
  tool: { flexDirection: 'column', justifyContent: 'flex-start', marginHorizontal: 20, gap: 5 },
  main: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  img: { width: 80, height: 80, backgroundColor: '#bda08b', borderRadius: 8 },
  postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8 },
  time: { color: 'rgba(240, 240, 229, 0.5)' },
  articles: { gap: 5 },
  profile: { marginLeft: 20, flexDirection: 'row', gap: 5, alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 20, color: '#f0f0e5', fontWeight: 'bold' },
  title: { color: '#f0f0e5', fontSize: 18, fontWeight: 'bold' },
  text: { color: '#f0f0e5', fontSize: 18 },
  icons: { marginHorizontal: 20, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  count: { fontSize: 15, color: '#f0f0e5' },
  tags: { marginTop: 5, flexDirection: 'row', gap: 8, alignItems: 'center' },
  tag: { backgroundColor: '#bda08b', paddingHorizontal: 10, paddingVertical: 8, color: '#f0f0e5', borderRadius: 20 },
  underline: { marginTop: 25, borderBottomWidth: 1, borderColor: 'rgba(240, 240, 229, 0.5)' },
  floatingTextButton: { flexDirection: 'row', position: "absolute", bottom: 40, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#f0f0e5", borderRadius: 20, justifyContent: "center", alignItems: "center", gap: 5 },
  floatingText: { fontSize: 16, color: "#9c7866" },
});
