import React, { useState, useRef } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  Alert,
} from "react-native";
import { AntDesign, FontAwesome6 } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

// ------------------ decodeBase64 함수 추가 ------------------
const decodeBase64 = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export default function AddVote() {
  const [activeTab, setActiveTab] = useState<"one" | "two">("one");
  const [visible, setVisible] = useState(false);
  const [wishModalVisible, setWishModalVisible] = useState(false);

  const [images, setImages] = useState<{ uri: string; base64: string | null }[]>([]);
  const [selectedWishlist, setSelectedWishlist] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [firstInputContent, setFirstInputContent] = useState("");
  const [secondInputContent, setSecondInputContent] = useState("");

  const screenHeight = Dimensions.get("window").height;
  const MAX_HEIGHT = screenHeight * 0.8;
  const slideAnim = useRef(new Animated.Value(MAX_HEIGHT)).current;

  // ------------------ 모달 애니메이션 ------------------
  const openSheet = (index: number) => {
    setCurrentIndex(index);
    setVisible(true);
    slideAnim.setValue(MAX_HEIGHT);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: MAX_HEIGHT,
      duration: 50,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  // ------------------ 이미지 선택 ------------------
  const pickImage = async () => {
    const remaining = 5 - (images.length + selectedWishlist.length);
    if (remaining <= 0) {
      Alert.alert("선택 제한", "이미지와 위시리스트 합쳐서 최대 5개까지 선택 가능합니다.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("갤러리 권한이 필요합니다.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        base64: asset.base64 ?? null,
      }));
      setImages(prev => [...prev, ...newImages]);
    }

    setVisible(false);
  };

  // ------------------ 위시리스트 ------------------
  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from("wishlist")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setWishlist(data || []);
      setVisible(false);
      setWishModalVisible(true);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWishlist = (item: any) => {
    const totalSelected = images.length + selectedWishlist.length;
    const alreadySelected = selectedWishlist.some(w => w.id === item.id);

    if (alreadySelected) {
      // 선택 해제: selectedWishlist에서 제거 + images에서도 제거
      setSelectedWishlist(prev => prev.filter(w => w.id !== item.id));
      setImages(prev => prev.filter(img => img.uri !== item.image)); // 위시 이미지 제거
    } else {
      if (totalSelected >= 5) {
        Alert.alert("선택 제한", "이미지와 위시리스트 합쳐서 최대 5개까지 선택 가능합니다.");
        return;
      }
      // 선택: selectedWishlist에 추가 + images에도 추가
      setSelectedWishlist(prev => [...prev, item]);
      setImages(prev => [...prev, { uri: item.image, base64: null }]);
    }
  };


  // ------------------ 이미지 업로드 헬퍼 ------------------
  const getArrayBufferForUpload = async (uri: string, fallbackBase64?: string | null) => {
    try {
      const res = await fetch(uri);
      const ab = res.arrayBuffer ? await res.arrayBuffer() : await (await res.blob()).arrayBuffer();
      if (ab && ab.byteLength > 0) return ab;
    } catch (e) {
      console.warn("fetch->arrayBuffer failed:", e);
    }
    if (fallbackBase64) {
      try {
        return decodeBase64(fallbackBase64);
      } catch (e) {
        console.warn("base64 decode failed:", e);
      }
    }
    try {
      const fsB64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return decodeBase64(fsB64);
    } catch (e) {
      console.warn("fs base64 decode failed:", e);
    }
    throw new Error("이미지 바이트를 확보하지 못했습니다.");
  };

  const mimeFromUri = (uri?: string | null) => {
    if (!uri) return "application/octet-stream";
    const ext = uri.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "webp":
        return "image/webp";
      default:
        return "image/*";
    }
  };

  const extFromMime = (mime: string) => {
    if (mime.includes("jpeg")) return "jpg";
    if (mime.includes("png")) return "png";
    if (mime.includes("webp")) return "webp";
    return "bin";
  };

  // ------------------ 투표 등록 ------------------
  const handlePost = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const uploadedUrls: string[] = [];

      for (const img of images) {
        const mime = mimeFromUri(img.uri);
        const ext = extFromMime(mime);
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const arrayBuffer = await getArrayBufferForUpload(img.uri, img.base64);
        const { error } = await supabase.storage.from("votes").upload(fileName, arrayBuffer, { contentType: mime, upsert: true });
        if (error) throw error;

        const { data: pub } = supabase.storage.from("votes").getPublicUrl(fileName);
        uploadedUrls.push(pub?.publicUrl ?? "");
      }

      // images와 wishlist를 서로 배타적으로 저장
      const first_choice_image = images[0] ? uploadedUrls[0] : null;
      const first_choice_wish_id = !images[0] && selectedWishlist[0] ? selectedWishlist[0].id : null;

      const second_choice_image = images[1] ? uploadedUrls[1] : null;
      const second_choice_wish_id = !images[1] && selectedWishlist[1] ? selectedWishlist[1].id : null;

      const { error } = await supabase.from("votes").insert([{
        user_id: user.id,
        first_choice_image,
        first_choice_wish_id,
        first_choice_content: firstInputContent,
        second_choice_image,
        second_choice_wish_id,
        second_choice_content: secondInputContent,
      }]);

      if (error) throw error;
      Alert.alert("저장 완료!");
      router.back();
    } catch (err: any) {
      console.error(err);
      Alert.alert("저장 실패", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <AntDesign name="close" size={30} color="#f0f0e5" />
        </TouchableOpacity>
      </View>

      {activeTab === "one" ? (
        <>
          <View style={styles.boxContainer}>
            <TouchableOpacity onPress={() => setActiveTab("two")}>
              <Text style={styles.title}>살까? 말까?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.box, images[0] && { borderWidth: 0 }]}
              onPress={() => openSheet(0)}
            >
              {images[0] ? (
                <Image
                  source={{ uri: images[0].uri }}
                  style={{ width: "100%", height: "100%", borderRadius: 10 }}
                  resizeMode="cover"
                />
              ) : (
                <FontAwesome6 name="add" size={25} color="#f0f0e5" />
              )}
            </TouchableOpacity>
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
            <Text style={styles.button}>post</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.boxContainer}>
            <TouchableOpacity onPress={() => setActiveTab("one")}>
              <Text style={styles.title}>둘 중 골라줘</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 20 }}>
              {[0, 1].map((index) => {
                const img = images[index];
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.box, img && { borderWidth: 0 }]}
                    onPress={() => openSheet(index)}
                  >
                    {img ? (
                      <Image
                        source={{ uri: img.uri }}
                        style={{ width: "100%", height: "100%", borderRadius: 10 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <FontAwesome6 name="add" size={25} color="#f0f0e5" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
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
            <Text style={styles.button}>post</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popup}>
                <Text style={styles.popupText}>please choose</Text>
                <View style={styles.add}>
                  <TouchableOpacity onPress={pickImage}>
                    <Text style={styles.addButton}>image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={fetchWishlist}>
                    <Text style={styles.addButton}>wish</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
                        style={{ width: 60, height: 60, borderRadius: 8 }}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#9c7866" },
  header: { flexDirection: "row", justifyContent: "space-between", marginTop: 40, marginHorizontal: 25, marginBottom: 15 },
  boxContainer: { alignItems: "center", gap: 20, marginTop: 10 },
  title: { color: "#9c7866", fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 15, backgroundColor: "#f0f0e5", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 30 },
  box: { borderRadius: 15, borderWidth: 1, borderColor: "rgba(240,240,229,0.3)", width: 160, height: 160, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(240,240,229,0.1)" },
  singleInput: { width: "85%", alignSelf: "center", marginVertical: 25, height: 100, borderRadius: 15, padding: 15, fontSize: 16, backgroundColor: "rgba(240,240,229,0.15)", color: "#f0f0e5", textAlignVertical: "top" },
  inputs: { marginHorizontal: 25, marginVertical: 20, flexDirection: "row", justifyContent: "space-between", gap: 15 },
  input: { flex: 1, height: 100, borderRadius: 15, padding: 15, fontSize: 16, backgroundColor: "rgba(240,240,229,0.15)", color: "#f0f0e5", textAlignVertical: "top" },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  popup: { width: "85%", maxHeight: "80%", backgroundColor: "#f0f0e5", borderRadius: 15, padding: 20 },
  popupText: { fontSize: 20, marginBottom: 10 },
  add: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
  addButton: { marginVertical: 10, width: 130, textAlign: "center", color: "#f0f0e5", fontSize: 18, paddingVertical: 12, borderRadius: 25, backgroundColor: "#b7aa93" },
  button: { marginHorizontal: 30, color: "#9c7866", fontSize: 20, fontWeight: "700", textAlign: "center", borderRadius: 25, borderWidth: 1, borderColor: "#f0f0e5", paddingVertical: 12, marginTop: 20, backgroundColor: "#f0f0e5" },
  wishItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, marginBottom: 5 },
});
