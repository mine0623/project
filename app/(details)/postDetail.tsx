import React, { useState, useEffect } from "react";
import {
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
import { AntDesign, Ionicons, FontAwesome6 } from "@expo/vector-icons";
import PostCard from "@/app/(details)/postCard";
import { SafeAreaView } from "react-native-safe-area-context";

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

  // 댓글 + 좋아요 fetch
  const fetchComments = async () => {
    if (!currentPost) return;
    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles(name, avatar_url),
        comment_likes(user_id)
      `)
      .eq("post_id", currentPost.id)
      .order("created_at", { ascending: true });

    if (error) return console.error(error);

    const formattedComments = data.map((c: any) => ({
      ...c,
      user_name: c.profiles?.name || "익명",
      user_avatar: c.profiles?.avatar_url || null,
      like_count: c.comment_likes.length,
      likedByCurrentUser: c.comment_likes.some((l: any) => l.user_id === currentUser?.id),
    }));

    setCurrentPost({ ...currentPost, comments: formattedComments });
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
      like_count: 0,
      likedByCurrentUser: false,
    };

    setCurrentPost({
      ...currentPost,
      comments: [...currentPost.comments, commentWithProfile],
    });
    setNewComment("");
  };

  const deletePost = async () => {
    const { error } = await supabase.from("posts").delete().eq("id", currentPost.id);
    if (error) Alert.alert("오류", "게시물 삭제에 실패했습니다.");
    else {
      Alert.alert("완료", "게시물이 삭제되었습니다.");
      router.back();
    }
  };

  const timeAgo = (date: string) => {
    const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}초전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간전`;
    return `${Math.floor(diff / 86400)}일전`;
  };

  if (!currentPost) return <Text>게시물 정보를 불러올 수 없습니다.</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
          <PostCard post={currentPost} currentUser={currentUser} />

          <View style={styles.commentsContainer}>
            <Text style={styles.commentHeader}>댓글</Text>
            {currentPost.comments?.map((c: any, idx: number) => (
              <View key={idx} style={styles.commentItem}>
                <View style={{ flexDirection: "row", gap: 8, justifyContent: 'flex-start' }}>
                  <Image source={{ uri: c.user_avatar }} style={styles.commentAvatar} />
                  <View style={{ flexDirection: 'column', gap: 5 }}>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                      <Text style={styles.commentName}>{c.user_name}</Text>
                      <Text style={styles.time}>{timeAgo(c.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.content}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요..."
            placeholderTextColor="#f0f0e5"
            value={newComment}
            onChangeText={setNewComment}
          />
          {newComment.trim().length > 0 && (
            <TouchableOpacity onPress={addComment}>
              <Ionicons name="send" size={18} color="#f0f0e5" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#9c7866" },
  header: { flexDirection: "row", justifyContent: "space-between", margin: 30, marginBottom: 10 },
  commentsContainer: { marginHorizontal: 20 },
  commentHeader: { fontSize: 25, fontWeight: "bold", color: "#f0f0e5", marginVertical: 20 },
  commentItem: { flexDirection: "row", justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 10 },
  commentName: { fontWeight: "bold", color: "#f0f0e5", fontSize: 16 },
  commentText: { color: "#f0f0e5", fontSize: 15 },
  commentInputContainer: { borderRadius: 30, marginHorizontal: 20, marginVertical: 10, backgroundColor: '#b7aa93',flexDirection: "row", alignItems: "center", paddingVertical: 20, paddingHorizontal: 25, },
  heart: { flexDirection: 'column', alignItems: 'center' },
  count: { color: '#f0f0e5' },
  time: { color: "rgba(240, 240, 229, 0.5)" },
  commentInput: { flex: 1, color: "#f0f0e5", fontSize: 16 },
  commentAvatar: { width: 35, height: 35, borderRadius: 50 },
});
