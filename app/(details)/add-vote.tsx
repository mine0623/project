import React, { useState } from "react";
import { router } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function AddVote() {
  const [activeTab, setActiveTab] = useState<"one" | "two">("one");
  const [wishModalVisible, setWishModalVisible] = useState(false);

  const [selectedWishlist, setSelectedWishlist] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [firstInputContent, setFirstInputContent] = useState("");
  const [secondInputContent, setSecondInputContent] = useState("");

  const fetchWishlist = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("로그인 필요", "로그인이 필요합니다.");
        return;
      }

      const { data, error } = await supabase
        .from("wishlist")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setWishlist(data || []);
      setWishModalVisible(true);
    } catch (err) {
      console.error(err);
    }
  };


  const toggleWishlist = (item: any) => {
    const boxIndex = currentIndex;

    if (activeTab === "one") {
      setSelectedWishlist([item]);
    } else {
      setSelectedWishlist((prev) => {
        const newArr = [...prev];
        newArr[boxIndex] = item;
        return newArr;
      });
    }

    setWishModalVisible(false);
  };

  const handlePost = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("로그인이 필요합니다.");

      const first_choice_wish_id = selectedWishlist[0]?.id ?? null;
      const second_choice_wish_id = selectedWishlist[1]?.id ?? null;

      const { error: dbError } = await supabase.from("votes").insert([{
        user_id: user.id,
        first_choice_wish_id,
        first_choice_content: firstInputContent,
        second_choice_wish_id,
        second_choice_content: secondInputContent,
      }]);

      if (dbError) throw dbError;

      Alert.alert("저장 완료!");
      router.back();
    } catch (err: any) {
      console.error(err);
      Alert.alert("저장 실패", err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <AntDesign name="close" size={30} color="#f0f0e5" />
            </TouchableOpacity>
          </View>
          <View style={styles.tabButtons}>
            <TouchableOpacity onPress={() => setActiveTab("one")}>
              <Text style={[styles.tabButtonText, activeTab === "one" && styles.activeTab]}>
                살까? 말까?
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab("two")}>
              <Text style={[styles.tabButtonText, activeTab === "two" && styles.activeTab]}>
                둘 중 골라줘
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "one" ? (
            <>
              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.box}
                  onPress={() => { setCurrentIndex(0); fetchWishlist(); }}
                >
                  {selectedWishlist[0]?.image ? (
                    <Image
                      source={{ uri: selectedWishlist[0].image }}
                      style={styles.boxImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="add-sharp" size={25} color="#f0f0e5" />
                  )}
                </TouchableOpacity>

                {selectedWishlist[0]?.image && (
                  <View style={styles.boxTextContainer}>
                    <Text
                      style={styles.boxText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {selectedWishlist[0].name}
                    </Text>
                    <Text style={styles.boxText}>{selectedWishlist[0].price}원</Text>
                  </View>
                )}
              </View>

              <TextInput
                style={styles.singleInput}
                placeholder="고민을 적어주세요."
                placeholderTextColor="#f0f0e5"
                multiline
                value={firstInputContent}
                onChangeText={setFirstInputContent}
              />
              <TouchableOpacity onPress={handlePost}>
                <Text style={styles.button}>완료</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", marginVertical: 15 }}>
                {[0, 1].map((index) => (
                  <View key={index} style={{ alignItems: "center" }}>
                    <TouchableOpacity
                      style={styles.box}
                      onPress={() => { setCurrentIndex(index); fetchWishlist(); }}
                    >
                      {selectedWishlist[index]?.image ? (
                        <Image
                          source={{ uri: selectedWishlist[index].image }}
                          style={styles.boxImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="add-sharp" size={25} color="#f0f0e5" />
                      )}
                    </TouchableOpacity>
                    {selectedWishlist[index]?.image && (
                      <View style={styles.boxTextContainer}>
                        <Text
                          style={styles.boxText}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {selectedWishlist[index].name}
                        </Text>
                        <Text style={styles.boxText}>
                          {selectedWishlist[index].price}원
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.inputs}>
                <TextInput
                  style={styles.input}
                  placeholder="고민을 적어주세요."
                  placeholderTextColor="#f0f0e5"
                  multiline
                  value={firstInputContent}
                  onChangeText={setFirstInputContent}
                />
                <TextInput
                  style={styles.input}
                  placeholder="고민을 적어주세요."
                  placeholderTextColor="#f0f0e5"
                  multiline
                  value={secondInputContent}
                  onChangeText={setSecondInputContent}
                />
              </View>
              <TouchableOpacity onPress={handlePost}>
                <Text style={styles.button}>완료</Text>
              </TouchableOpacity>
            </>
          )}


          <Modal visible={wishModalVisible} transparent animationType="slide">
            <TouchableWithoutFeedback onPress={() => setWishModalVisible(false)}>
              <View style={styles.overlay}>
                <TouchableWithoutFeedback>
                  <View style={[styles.popup, { maxHeight: "70%" }]}>
                    <Text style={styles.popupText}>wishlist</Text>
                    <FlatList
                      data={wishlist}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.wishItem}
                          onPress={() => toggleWishlist(item)}
                        >
                          <Image
                            source={{ uri: item.image }}
                            style={styles.wishImage}
                          />
                          <View style={{ marginLeft: 10 }}>
                            <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                            <Text>{item.price}원</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView >
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#9c7866" },
  header: { flexDirection: "row", justifyContent: "space-between", marginTop: 40, marginHorizontal: 25, marginBottom: 15 },
  box: { borderRadius: 15, width: 160, height: 160, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(240,240,229,0.1)" },
  singleInput: { width: 160, marginTop: 20, alignSelf: "center", height: 100, borderRadius: 15, padding: 15, fontSize: 16, backgroundColor: "rgba(240,240,229,0.15)", color: "#f0f0e5", textAlignVertical: "top" },
  inputs: { marginHorizontal: 30, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  input: { flex: 1, width: 160, height: 100, borderRadius: 15, padding: 15, fontSize: 16, backgroundColor: "rgba(240,240,229,0.15)", color: "#f0f0e5", textAlignVertical: "top" },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  popup: { width: "85%", maxHeight: "80%", backgroundColor: "#b7aa93", borderRadius: 15, padding: 20 },
  popupText: { fontSize: 20, marginBottom: 10, color: "#f0f0e5" },
  wishItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, marginBottom: 5, borderBottomWidth: 0.5, borderBottomColor: "#f0f0e5" },
  wishImage: { width: 50, height: 50, borderRadius: 10 },
  tabButtons: { flexDirection: "row", justifyContent: "center", marginTop: 20, marginBottom: 10, gap: 10 },
  tabButtonText: { fontSize: 18, fontWeight: "bold", color: "#f0f0e5", paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#f0f0e5' },
  activeTab: { backgroundColor: "#f0f0e5", color: '#9c7866' },
  button: { marginTop: 30, borderRadius: 20, backgroundColor: '#b7aa93', marginHorizontal: 50, color: "#f0f0e5", fontSize: 18, textAlign: "center", fontWeight: 'bold', paddingVertical: 15, },
  boxImage: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },
  boxTextContainer: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 5,
    maxWidth: 170,
    gap: 5
  },
  boxText: {
    color: "#f0f0e5",
    fontSize: 15,
    textAlign: 'center',
    flexWrap: 'wrap'
  },

});
