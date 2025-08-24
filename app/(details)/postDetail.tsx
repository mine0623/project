import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import PostCard from "@/app/(details)/postCard";

export default function PostDetail() {
  const params = useLocalSearchParams<{ post: string | string[] }>();
  const postString = Array.isArray(params.post) ? params.post[0] : params.post;
  const postData = postString ? JSON.parse(postString) : null;

  const [currentPost, setCurrentPost] = useState<any>(postData);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newComment, setNewComment] = useState<string>("");

  useEffect(() => {
    getCurrentUser();
    fetchComments();
  }, []);

  const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setCurrentUser(data.user);
  };

  const fetchComments = async () => {
    if (!currentPost) return;
    const { data, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, profiles(name, avatar_url)")
      .eq("post_id", currentPost.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const formattedComments = data.map((c: any) => ({
        ...c,
        user_name: c.profiles?.name || "익명",
        user_avatar: c.profiles?.avatar_url || null,
      }));
      setCurrentPost({ ...currentPost, comments: formattedComments });
    }
  };

  const addComment = async () => {
    if (!currentUser || !newComment.trim()) return;

    const { data: newCommentData, error: insertError } = await supabase
      .from("comments")
      .insert([{ post_id: currentPost.id, user_id: currentUser.id, content: newComment.trim() }])
      .select("*")
      .single();

    if (insertError || !newCommentData) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", currentUser.id)
      .single();

    const commentWithProfile = {
      ...newCommentData,
      user_name: profileData?.name || "익명",
      user_avatar: profileData?.avatar_url || null,
    };

    setCurrentPost({
      ...currentPost,
      comments: [...currentPost.comments, commentWithProfile],
    });
    setNewComment("");
  };

  const deletePost = async () => {
    const { error } = await supabase.from("posts").delete().eq("id", currentPost.id);

    if (error) {
      Alert.alert("오류", "게시물 삭제에 실패했습니다.");
    } else {
      Alert.alert("완료", "게시물이 삭제되었습니다.");
      router.back();
    }
  };

  if (!currentPost) return <Text>게시물 정보를 불러올 수 없습니다.</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <AntDesign name="close" size={30} color="#f0f0e5" />
          </TouchableOpacity>
          {currentUser?.id === currentPost.profiles?.id && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert("게시물 삭제", "정말 삭제하시겠습니까?", [
                  { text: "취소", style: "cancel" },
                  { text: "삭제", style: "destructive", onPress: deletePost },
                ])
              }
            >
              <FontAwesome6 name="trash" size={25} color="#f0f0e5" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* 🔹 PostCard 재사용 */}
          <PostCard
            post={currentPost}
            currentUser={currentUser}
          />

          {/* 댓글 */}
          <View style={styles.commentsContainer}>
            <Text style={styles.commentHeader}>comment</Text>
            {currentPost.comments?.map((c: any, idx: number) => (
              <View key={idx} style={styles.commentItem}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {c.user_avatar ? (
                    <Image source={{ uri: c.user_avatar }} style={styles.commentAvatar} />
                  ) : (
                    <Ionicons name="person-circle-sharp" size={35} color="#b7aa93" />
                  )}
                  <Text style={styles.commentName}>{c.user_name || "익명"}</Text>
                </View>
                <Text style={styles.commentText}>{c.content}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 댓글 입력 */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요..."
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity onPress={addComment}>
            <Ionicons name="send" size={20} color="#f0f0e5" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#9c7866" },
  header: { flexDirection: "row", justifyContent: "space-between", margin: 30, marginBottom: 10 },
  commentsContainer: { marginHorizontal: 20 },
  commentHeader: { fontSize: 25, fontWeight: "bold", color: "#f0f0e5", marginBottom: 20 },
  commentItem: { flexDirection: "column", marginBottom: 20, gap: 10 },
  commentName: { fontWeight: "bold", color: "#f0f0e5", fontSize: 18 },
  commentText: { color: "#f0f0e5", fontSize: 15 },
  commentInputContainer: {
    flexDirection: "row",
    alignSelf: "stretch",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 20,
    backgroundColor: "rgba(240, 240, 229, 0.3)",
    borderRadius: 20,
    justifyContent: "space-around",
    alignItems: "center",
    gap: 5,
  },
  commentInput: { flex: 1, color: "#f0f0e5", fontSize: 16 },
  commentAvatar: { width: 35, height: 35, borderRadius: 50 },
});
