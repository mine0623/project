import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, Keyboard, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ImageViewing from "react-native-image-viewing";
import { supabase } from "@/lib/supabase";
import { create } from "zustand";

interface PostCardProps {
  post: any;
  currentUser: any;
}

interface HeartState {
  hearts: { [postId: string]: any[] };
  setHearts: (postId: string, hearts: any[]) => void;
}

const useHeartStore = create<HeartState>((set) => ({
  hearts: {},
  setHearts: (postId, newHearts) =>
    set((state: HeartState) => ({
      hearts: {
        ...state.hearts,
        [postId]: newHearts || [],
      },
    })),
}));

export default function PostCard({ post, currentUser }: PostCardProps) {
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [wishImages, setWishImages] = useState<string[]>([]);
  const profile = post.profiles;
  const router = useRouter();


  const hearts = useHeartStore((state) => state.hearts[post.id] || []);
  const setHearts = useHeartStore((state) => state.setHearts);

  useEffect(() => {
    if (post.hearts) {
      setHearts(post.id, post.hearts);
    }
  }, [post.hearts]);

  useEffect(() => {
    const fetchWishImages = async () => {
      if (!Array.isArray(post.wishlist_ids) || post.wishlist_ids.length === 0) return;

      try {
        const { data: wishes, error } = await supabase
          .from("wishlist")
          .select("id, image")
          .in("id", post.wishlist_ids);

        if (error) {
          console.error("Wishlist fetch error:", error);
          return;
        }

        if (wishes && wishes.length > 0) {
          const images = wishes
            .map((w: any) =>
              w.image
                ? supabase.storage.from("wishlist-images").getPublicUrl(w.image).data?.publicUrl
                : null
            )
            .filter(Boolean) as string[];

          setWishImages(images);
        }
      } catch (err) {
        console.error("Unexpected error fetching wishlist images:", err);
      }
    };

    fetchWishImages();
  }, [post.wishlist_ids]);

  const allImages = [...(Array.isArray(post.images) ? post.images : [])];

  const getAgeGroup = (birth_year: number | null) => {
    if (!birth_year) return "연령대 없음";
    const age = new Date().getFullYear() - birth_year;
    if (age < 10) return "10세 미만";
    const group = Math.floor(age / 10) * 10;
    return `${group}대`;
  };

  const timeAgo = (date: string) => {
    const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}초전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간전`;
    return `${Math.floor(diff / 86400)}일전`;
  };

  const openImageViewer = (index: number) => {
    setViewerIndex(index);
    setIsViewerVisible(true);
  };

  const toggleHeart = async () => {
    if (!currentUser) return;

    const hasHeart = hearts.some((h: any) => h.user_id === currentUser.id);

    if (hasHeart) {
      await supabase
        .from("hearts")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUser.id);

      setHearts(
        post.id,
        hearts.filter((h: any) => h.user_id !== currentUser.id)
      );
    } else {
      await supabase.from("hearts").insert([{ post_id: post.id, user_id: currentUser.id }]);
      setHearts(post.id, [...hearts, { user_id: currentUser.id }]);
    }
  };

  const hasHeart = currentUser ? hearts.some((h: any) => h.user_id === currentUser.id) : false;

  return (
    <View>
      <View style={styles.post}>
        <View style={styles.postHeader}>
          <View style={styles.profile}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle-sharp" size={35} color="#b7aa93" />
            )}
            <Text style={styles.name}>{profile?.name || "익명"}</Text>
          </View>

          <Text style={styles.time}>{getAgeGroup(profile?.birth_year)}</Text>
          <Text style={styles.time}>|</Text>
          <Text style={styles.time}>{profile?.gender || "성별 없음"}</Text>
          <Text style={styles.time}>|</Text>
          <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
        </View>

        {allImages.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {allImages.map((img: string, idx: number) => (
              <TouchableOpacity key={idx} onPress={() => openImageViewer(idx)}>
                <Image source={{ uri: img }} style={styles.imageItem} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.articles}>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.text}>{post.content}</Text>
        </View>

        <View style={styles.tags}>
          {post.tags?.map((tag: string, index: number) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                Keyboard.dismiss(); // ✅ 키보드 내리기
                router.push({
                  pathname: "/search",
                  params: { tag },
                });
              }}
            >
              <Text style={styles.tag}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>


        <View style={styles.icons}>
          <View style={styles.icon}>
            <TouchableOpacity onPress={toggleHeart}>
              <Ionicons
                name="heart"
                size={27}
                color={hasHeart ? "#e5c1bd" : "rgba(240, 240, 229, 0.2)"}
              />
            </TouchableOpacity>
            <Text style={styles.count}>{hearts.length}</Text>
          </View>
          <View style={styles.icon}>
            <Ionicons name="chatbox" size={27} color="#dfc8ba" />
            <Text style={styles.count}>
              {Array.isArray(post.comments) ? post.comments.length : 0}
            </Text>
          </View>
        </View>

        <View style={styles.underline}></View>
      </View>

      <ImageViewing
        images={allImages.map((img: string) => ({ uri: img }))}
        imageIndex={viewerIndex}
        visible={isViewerVisible}
        onRequestClose={() => setIsViewerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  post: { marginTop: 15, flexDirection: "column", gap: 10 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20 },
  profile: { flexDirection: "row", gap: 5, alignItems: "center" },
  avatar: { width: 35, height: 35, borderRadius: 50 },
  name: { fontSize: 20, color: "#f0f0e5", fontWeight: "bold" },
  time: { color: "rgba(240, 240, 229, 0.5)" },
  articles: { gap: 5, marginHorizontal: 20 },
  title: { color: "#f0f0e5", fontSize: 18, fontWeight: "bold" },
  text: { color: "#f0f0e5", fontSize: 18 },
  imageScroll: { marginHorizontal: 20, marginTop: 5 },
  imageItem: { width: 200, height: 200, borderRadius: 8, marginRight: 10 },
  tags: { marginHorizontal: 20, flexDirection: "row", gap: 8, marginTop: 5 },
  tag: {
    backgroundColor: "#bda08b",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#f0f0e5",
    borderRadius: 20,
  },
  icons: { marginHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 5 },
  icon: { flexDirection: "row", alignItems: "center", gap: 5 },
  count: { fontSize: 15, color: "#f0f0e5" },
  underline: { borderBottomWidth: 1, borderColor: "rgba(240, 240, 229, 0.5)", marginTop: 10 },
});
