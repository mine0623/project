// import React, { useState, useEffect } from "react";
// import {
//     SafeAreaView,
//     View,
//     Text,
//     Image,
//     StyleSheet,
//     ScrollView,
//     TouchableOpacity,
//     TextInput,
//     KeyboardAvoidingView,
//     Platform
// } from "react-native";
// import { useLocalSearchParams } from "expo-router";
// import { router } from "expo-router";
// import { AntDesign, Ionicons } from "@expo/vector-icons";
// import { supabase } from "@/lib/supabase";
// import ImageViewing from "react-native-image-viewing";

// export default function PostDetail() {
//     const params = useLocalSearchParams<{ post: string | string[] }>();
//     const postString = Array.isArray(params.post) ? params.post[0] : params.post;
//     const postData = postString ? JSON.parse(postString) : null;

//     const [currentPost, setCurrentPost] = useState<any>(postData);
//     const [currentUser, setCurrentUser] = useState<any>(null);
//     const [newComment, setNewComment] = useState<string>("");

//     // 전체 화면 이미지 슬라이드 상태
//     const [isVisible, setIsVisible] = useState(false);
//     const [selectedIndex, setSelectedIndex] = useState(0);

//     useEffect(() => {
//         getCurrentUser();
//         fetchComments();
//     }, []);

//     const getCurrentUser = async () => {
//         const { data, error } = await supabase.auth.getUser();
//         if (!error) setCurrentUser(data.user);
//     };

//     // 🔹 댓글 불러오기 (프로필 이름 포함)
//     const fetchComments = async () => {
//         if (!currentPost) return;

//         const { data, error } = await supabase
//             .from("comments")
//             .select("id, content, created_at, user_id, profiles(name, avatar_url)")
//             .eq("post_id", currentPost.id)
//             .order("created_at", { ascending: true });

//         if (!error && data) {
//             const formattedComments = data.map((c: any) => ({
//                 ...c,
//                 user_name: c.profiles?.name || "익명",
//                 user_avatar: c.profiles?.avatar_url || null,
//             }));
//             setCurrentPost({ ...currentPost, comments: formattedComments });
//         }
//     };

//     const toggleHeart = async () => {
//         if (!currentUser || !currentPost) return;

//         const hasHeart = currentPost.hearts.some((h: any) => h.user_id === currentUser.id);
//         const updatedHearts = hasHeart
//             ? currentPost.hearts.filter((h: any) => h.user_id !== currentUser.id)
//             : [...currentPost.hearts, { user_id: currentUser.id }];

//         setCurrentPost({ ...currentPost, hearts: updatedHearts });

//         if (hasHeart) {
//             await supabase.from("hearts").delete().eq("post_id", currentPost.id).eq("user_id", currentUser.id);
//         } else {
//             await supabase.from("hearts").insert([{ post_id: currentPost.id, user_id: currentUser.id }]);
//         }
//     };

//     const addComment = async () => {
//         if (!currentUser || !newComment.trim()) return;

//         // 댓글 추가
//         const { data: newCommentData, error: insertError } = await supabase
//             .from("comments")
//             .insert([{ post_id: currentPost.id, user_id: currentUser.id, content: newComment.trim() }])
//             .select("*")
//             .single();

//         if (insertError || !newCommentData) return;

//         // 작성자 프로필 가져오기
//         const { data: profileData } = await supabase
//             .from("profiles")
//             .select("name, avatar_url")
//             .eq("id", currentUser.id)
//             .single();

//         const commentWithProfile = {
//             ...newCommentData,
//             user_name: profileData?.name || "익명",
//             user_avatar: profileData?.avatar_url || null,
//         };

//         setCurrentPost({
//             ...currentPost,
//             comments: [...currentPost.comments, commentWithProfile],
//         });
//         setNewComment("");
//     };


//     if (!currentPost) return <Text>게시물 정보를 불러올 수 없습니다.</Text>;

//     const profile = currentPost.profiles;
//     const hasHeart = currentUser ? currentPost.hearts.some((h: any) => h.user_id === currentUser.id) : false;

//     const getAgeGroup = (birth_year: number | null) => {
//         if (!birth_year) return "연령대 없음";
//         const age = new Date().getFullYear() - birth_year;
//         if (age < 10) return "10세 미만";
//         const group = Math.floor(age / 10) * 10;
//         return `${group}대`;
//     };

//     const timeAgo = (date: string) => {
//         const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
//         if (diff < 60) return `${Math.floor(diff)}초 전`;
//         if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
//         if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
//         return `${Math.floor(diff / 86400)}일 전`;
//     };

//     const images = Array.isArray(currentPost.images)
//         ? currentPost.images.map((img: string) => ({ uri: img }))
//         : currentPost.images
//             ? [{ uri: currentPost.images }]
//             : [];

//     return (
//         <SafeAreaView style={styles.container}>
//             <KeyboardAvoidingView
//                 style={{ flex: 1 }}
//                 behavior={Platform.OS === "ios" ? "padding" : "height"}
//                 keyboardVerticalOffset={0}
//             >
//                 <View style={styles.header}>
//                     <TouchableOpacity onPress={() => router.back()}>
//                         <AntDesign name="close" size={30} color="#f0f0e5" />
//                     </TouchableOpacity>
//                     <TouchableOpacity>
//                         <Ionicons name="trash" size={30} color="#f0f0e5" />
//                     </TouchableOpacity>
//                 </View>
//                 <ScrollView style={{ flex: 1 }}>
//                     <View style={styles.post}>
//                         {/* 헤더 */}
//                         <View style={styles.postHeader}>
//                             {profile?.avatar_url ? (
//                                 <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
//                             ) : (
//                                 <Ionicons name="person-circle-sharp" size={50} color="#b7aa93" />
//                             )}
//                             <Text style={styles.name}>{profile?.name || "익명"}</Text>
//                             <Text style={styles.time}>
//                                 {getAgeGroup(profile?.birth_year)} | {profile?.gender || "성별 없음"} |{" "}
//                                 {timeAgo(currentPost.created_at)}
//                             </Text>
//                         </View>

//                         {/* 제목 + 내용 */}
//                         <View style={styles.tool}>
//                             <View style={styles.articles}>
//                                 <Text style={styles.title}>{currentPost.title}</Text>
//                                 <Text style={styles.text}>{currentPost.content}</Text>
//                             </View>

//                             {/* 이미지 여러 장 */}
//                             {currentPost.images?.length > 0 && (
//                                 <ScrollView horizontal style={styles.images} showsHorizontalScrollIndicator={false}>
//                                     {Array.isArray(currentPost.images)
//                                         ? currentPost.images.map((img: string, i: number) => (
//                                             <TouchableOpacity
//                                                 key={i}
//                                                 onPress={() => {
//                                                     setSelectedIndex(i);
//                                                     setIsVisible(true);
//                                                 }}
//                                             >
//                                                 <Image source={{ uri: img }} style={styles.imageItem} />
//                                             </TouchableOpacity>
//                                         ))
//                                         : (
//                                             <TouchableOpacity
//                                                 onPress={() => {
//                                                     setSelectedIndex(0);
//                                                     setIsVisible(true);
//                                                 }}
//                                             >
//                                                 <Image source={{ uri: currentPost.images }} style={styles.imageItem} />
//                                             </TouchableOpacity>
//                                         )}
//                                 </ScrollView>
//                             )}
//                         </View>

//                         <ImageViewing
//                             images={images}
//                             imageIndex={selectedIndex}
//                             visible={isVisible}
//                             onRequestClose={() => setIsVisible(false)}
//                             backgroundColor="black"
//                         />

//                         <View style={styles.icons}>
//                             <TouchableOpacity style={styles.icon} onPress={toggleHeart}>
//                                 <Ionicons
//                                     name="heart"
//                                     size={27}
//                                     color={hasHeart ? "#e5c1bd" : "rgba(240, 240, 229, 0.2)"}
//                                 />
//                                 <Text style={styles.count}>{currentPost.hearts.length}</Text>
//                             </TouchableOpacity>

//                             <View style={styles.icon}>
//                                 <Ionicons name="chatbox" size={27} color="#dfc8ba" />
//                                 <Text style={styles.count}>{currentPost.comments.length}</Text>
//                             </View>
//                         </View>

//                         <View style={styles.underline}></View>

//                         {/* 댓글 리스트 */}
//                         <View style={styles.commentsContainer}>
//                             <Text style={styles.commentHeader}>comment</Text>
//                             {currentPost.comments?.map((c: any, idx: number) => (
//                                 <View key={idx} style={styles.commentItem}>
//                                     <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
//                                         {c.user_avatar ? (
//                                             <Image source={{ uri: c.user_avatar }} style={styles.commentAvatar} />
//                                         ) : (
//                                             <Ionicons name="person-circle-sharp" size={35} color="#b7aa93" />
//                                         )}
//                                         <Text style={styles.commentName}>{c.user_name || "익명"}</Text>
//                                     </View>
//                                     <Text style={styles.commentText}>{c.content}</Text>
//                                 </View>
//                             ))}
//                         </View>
//                     </View>
//                 </ScrollView>
//                 <View style={styles.commentInputContainer}>
//                     <TextInput
//                         style={styles.commentInput}
//                         placeholder="댓글을 입력하세요..."
//                         value={newComment}
//                         onChangeText={setNewComment}

//                     />
//                     <TouchableOpacity onPress={addComment}>
//                         <Ionicons name="send" size={20} color="#f0f0e5" />
//                     </TouchableOpacity>
//                 </View>
//             </KeyboardAvoidingView>
//         </SafeAreaView>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: "#9c7866" },
//     header: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         margin: 30,
//         marginBottom: 10,
//     },
//     post: { marginTop: 25, flexDirection: "column", gap: 10 },
//     postHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20 },
//     avatar: { width: 35, height: 35, borderRadius: 50 },
//     name: { fontSize: 20, color: "#f0f0e5", fontWeight: "bold" },
//     time: { color: "rgba(240, 240, 229, 0.5)" },
//     tool: { flexDirection: "column", justifyContent: "flex-start", marginHorizontal: 20, gap: 10 },
//     articles: { gap: 5 },
//     title: { color: "#f0f0e5", fontSize: 18, fontWeight: "bold" },
//     text: { color: "#f0f0e5", fontSize: 18 },
//     images: { flexDirection: "row" },
//     imageItem: { width: 150, height: 150, borderRadius: 10, marginRight: 10 },
//     icons: { marginHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 10 },
//     icon: { flexDirection: "row", alignItems: "center", gap: 5 },
//     count: { fontSize: 15, color: "#f0f0e5" },
//     underline: { borderBottomWidth: 1, borderColor: "rgba(240, 240, 229, 0.5)" },

//     commentsContainer: { marginHorizontal: 20, },
//     commentHeader: { fontSize: 25, fontWeight: "bold", color: "#f0f0e5", marginBottom: 20 },
//     commentItem: { flexDirection: "column", marginBottom: 20, gap: 10 },
//     commentName: { fontWeight: "bold", color: "#f0f0e5", fontSize: 18 },
//     commentText: { color: "#f0f0e5", fontSize: 15 },

//     commentInputContainer: {
//         flexDirection: 'row',
//         alignSelf: "stretch",
//         paddingHorizontal: 20,
//         paddingVertical: 10,
//         marginHorizontal: 20,
//         backgroundColor: "rgba(240, 240, 229, 0.3)",
//         borderRadius: 20,
//         justifyContent: "space-around",
//         alignItems: "center",
//         gap: 5,
//     },
//     commentInput: { flex: 1, color: "#f0f0e5", fontSize: 16 },
//     commentAvatar: { width: 35, height: 35, borderRadius: 50 },
// });
