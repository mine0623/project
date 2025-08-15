import React, { useState, useEffect } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function ProfileSettings() {
  const [selectedTab, setSelectedTab] = useState("전체");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const tabs = ["전체", "추천", "질문"];

  useEffect(() => {
    getCurrentUser();
    fetchPosts();
  }, [selectedTab]);

  const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setCurrentUser(data.user);
  };

  const fetchPosts = async () => {
    setLoading(true);
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
          avatar_url
        ),
        hearts (
          user_id
        ),
        comments (
          id
        )
      `)
      .order("created_at", { ascending: false });

    if (selectedTab !== "전체") {
      query = query.contains("tags", [selectedTab]);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching posts:", error);
    else setPosts(data);
    setLoading(false);
  };

  const toggleHeart = async (postId: number) => {
    if (!currentUser) return;

    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return;

    const post = posts[postIndex];

    const hasHeart = post.hearts.some((h: any) => h.user_id === currentUser.id);

    if (hasHeart) {
      // 삭제
      await supabase
        .from("hearts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUser.id);
    } else {
      // 추가
      await supabase
        .from("hearts")
        .insert([{ post_id: postId, user_id: currentUser.id }]);
    }

    fetchPosts();
  };

  const renderPost = ({ item }: { item: any }) => {
    const hasHeart = currentUser
      ? item.hearts.some((h: any) => h.user_id === currentUser.id)
      : false;

    return (
      <View style={styles.post}>
        <View style={styles.postHeader}>
          <TouchableOpacity style={styles.profile}>
            {item.profiles?.avatar_url ? (
              <Image
                source={{ uri: item.profiles.avatar_url }}
                style={{ width: 35, height: 35, borderRadius: 50 }}
              />
            ) : (
              <Ionicons name="person-circle-sharp" size={35} color="#b7aa93" />
            )}
            <Text style={styles.name}>{item.profiles?.name || "익명"}</Text>
          </TouchableOpacity>
          <Text style={styles.time}>{item.profiles?.gender || "성별 없음"}</Text>
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
              <Image
                source={{ uri: item.images[0] }}
                style={styles.img}
                resizeMode="cover"
              />
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
            <Text style={styles.count}>{item.hearts?.length || 0}</Text>
          </View>
          <View style={styles.icon}>
            <Ionicons name="chatbox" size={27} color="#dfc8ba" />
            <Text style={styles.count}>{item.comments?.length || 0}</Text>
          </View>
        </View>

        <View style={styles.underline}></View>
      </View>
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

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id.toString()}
        />
      )}

      <TouchableOpacity
        style={styles.floatingTextButton}
        onPress={() => router.push("/add-post")}
      >
        <Text style={styles.floatingText}>글쓰기</Text>
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
        flexDirection: 'column',
        justifyContent: 'flex-start',
        marginHorizontal: 20,
        gap: 5,
    },
    main: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
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
        justifyContent: 'flex-start',
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
        alignItems: 'center',
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
    floatingTextButton: {
        position: "absolute",
        bottom: 30,
        left: "50%",
        transform: [{ translateX: -40 }],
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#f0f0e5",
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    floatingText: {
        fontSize: 16,
    },

});
