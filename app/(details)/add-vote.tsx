import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  StyleSheet,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { decode as decodeBase64 } from "base64-arraybuffer";

const { width } = Dimensions.get("window");

export default function AddVote() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [textTabs, setTextTabs] = useState(["", ""]);
  const [imagesTabs, setImagesTabs] = useState([[], []] as { uri: string; base64: string | null }[][]);
  const [selectedWishlistTabs, setSelectedWishlistTabs] = useState([[], []] as any[][]);
  const [wishlist, setWishlist] = useState<any[]>([]);

  // ================== 위시 데이터 불러오기 ==================
  useEffect(() => {
    const fetchWishlist = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("wishlist")
        .select("*")
        .eq("user_id", user.id);

      if (error) console.error(error);
      else setWishlist(data ?? []);
    };
    fetchWishlist();
  }, []);

  // ================== 이미지 선택 ==================
  const pickImage = async (tabIndex: number) => {
    const limit = tabIndex === 0 ? 1 : 2;
    const totalSelected = imagesTabs[tabIndex].length + selectedWishlistTabs[tabIndex].length;
    if (totalSelected >= limit) return;

    const remaining = limit - imagesTabs[tabIndex].length - selectedWishlistTabs[tabIndex].length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(a => ({ uri: a.uri, base64: a.base64 ?? null }));
      const newImagesTabs = [...imagesTabs];
      newImagesTabs[tabIndex] = [...newImagesTabs[tabIndex], ...newImages];
      setImagesTabs(newImagesTabs);
    }
  };

  const removeImage = (tabIndex: number, index: number) => {
    const newImagesTabs = [...imagesTabs];
    newImagesTabs[tabIndex] = newImagesTabs[tabIndex].filter((_, i) => i !== index);
    setImagesTabs(newImagesTabs);
  };

  // ================== 위시 선택 ==================
  const handleWishlistSelect = (tabIndex: number, item: any) => {
    const limit = tabIndex === 0 ? 1 : 2;
    const currentImagesCount = imagesTabs[tabIndex].length;
    const currentWishlist = selectedWishlistTabs[tabIndex];
    const alreadySelected = currentWishlist.some(w => w.id === item.id);

    if (tabIndex === 0) {
      setSelectedWishlistTabs(prev => {
        const copy = [...prev];
        copy[tabIndex] = alreadySelected ? [] : [item];
        return copy;
      });
    } else {
      if (alreadySelected) {
        setSelectedWishlistTabs(prev => {
          const copy = [...prev];
          copy[tabIndex] = copy[tabIndex].filter(w => w.id !== item.id);
          return copy;
        });
      } else if (currentWishlist.length + currentImagesCount < limit) {
        setSelectedWishlistTabs(prev => {
          const copy = [...prev];
          copy[tabIndex] = [...copy[tabIndex], item];
          return copy;
        });
      }
    }
  };

  const renderWishlist = (tabIndex: number) =>
    wishlist.map(item => {
      const isSelected = selectedWishlistTabs[tabIndex].some(w => w.id === item.id);
      return (
        <TouchableOpacity
          key={item.id}
          onPress={() => handleWishlistSelect(tabIndex, item)}
          style={[styles.wishlistCard, isSelected && styles.wishlistCardSelected]}
        >
          <Image source={{ uri: item.image }} style={styles.wishlistImage} />
          <View style={styles.wishlistInfo}>
            <Text style={styles.wishlistName} numberOfLines={1}>{item.brand}</Text>
            <Text style={styles.wishlistName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.wishlistPrice}>{item.price}원</Text>
          </View>
        </TouchableOpacity>
      );
    });

  // ================== 이미지 업로드 ==================
  const mimeFromUri = (uri?: string) => {
    if (!uri) return "application/octet-stream";
    const ext = uri.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg": case "jpeg": return "image/jpeg";
      case "png": return "image/png";
      case "webp": return "image/webp";
      case "heic": return "image/heic";
      default: return "image/*";
    }
  };

  const extFromMime = (mime: string) => {
    if (mime.includes("jpeg")) return "jpg";
    if (mime.includes("png")) return "png";
    if (mime.includes("webp")) return "webp";
    if (mime.includes("heic")) return "heic";
    return "bin";
  };

  const getArrayBufferForUpload = async (uri: string, fallbackBase64?: string | null) => {
    try {
      const res = await fetch(uri);
      return await res.arrayBuffer();
    } catch {
      if (fallbackBase64) return decodeBase64(fallbackBase64);
      const fsB64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      return decodeBase64(fsB64);
    }
  };

  const uploadImages = async (tabIndex: number) => {
    const uploadedUrls: string[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const files = imagesTabs[tabIndex];
    for (let i = 0; i < files.length; i++) {
      const { uri, base64 } = files[i];
      const mime = mimeFromUri(uri);
      const ext = extFromMime(mime);
      const fileName = `votes/${user.id}_${Date.now()}_${i}.${ext}`;

      try {
        const arrayBuffer = await getArrayBufferForUpload(uri, base64);
        const { error } = await supabase.storage.from("votes").upload(fileName, new Uint8Array(arrayBuffer), {
          contentType: mime,
          upsert: true,
        });
        if (error) throw error;

        const { data: pub } = supabase.storage.from("votes").getPublicUrl(fileName);
        uploadedUrls.push(pub.publicUrl ?? "");
      } catch (e: any) {
        console.error("이미지 업로드 실패:", e);
        Alert.alert("이미지 업로드 실패", e.message);
      }
    }

    return uploadedUrls;
  };

  // ================== 투표 제출 ==================
  const submitVote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert("로그인이 필요합니다");

    const allImagesUrls: string[][] = [];
    for (let i = 0; i < 2; i++) {
      const urls = await uploadImages(i);
      allImagesUrls.push(urls);
    }

    const contents = textTabs.map((text, idx) => {
      const wishImgs = selectedWishlistTabs[idx].map(w => w.image);
      return { content: text, images: [...allImagesUrls[idx], ...wishImgs] };
    });

    for (let i = 0; i < contents.length; i++) {
      if (!contents[i].content.trim()) continue;
      const { error } = await supabase.from("votes").insert([{
        user_id: user.id,
        content: contents[i].content,
        images: contents[i].images,
      }]);
      if (error) console.error("DB 저장 실패:", error);
    }

    // 리셋 후 vote 화면으로 이동
    setTextTabs(["", ""]);
    setImagesTabs([[], []]);
    setSelectedWishlistTabs([[], []]);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/vote"))}>
          <AntDesign name="close" size={30} color="#f0f0e5" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {["살말", "A vs B"].map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.tabButton, activeTab === index && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab(index);
              scrollRef.current?.scrollTo({ x: index * width, animated: true });
            }}
          >
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setActiveTab(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {[0, 1].map(tabIndex => (
          <View key={tabIndex} style={[styles.page, { width }]}>
            <TextInput
              style={styles.textInput}
              placeholder={tabIndex === 0 ? "살까? 말까?" : "둘 중 골라줘!"}
              placeholderTextColor="#f0f0e5"
              multiline
              value={textTabs[tabIndex]}
              onChangeText={t => {
                const copy = [...textTabs];
                copy[tabIndex] = t;
                setTextTabs(copy);
              }}
            />

            <View style={styles.tool}>
              <Text style={styles.title}>img</Text>
              <View style={styles.images}>
                <TouchableOpacity style={styles.pickButton} onPress={() => pickImage(tabIndex)}>
                  <Text>image({tabIndex === 0 ? 1 : 2}개)</Text>
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                  {imagesTabs[tabIndex].map((img, i) => (
                    <TouchableOpacity key={i} onPress={() => removeImage(tabIndex, i)} style={styles.imageWrapper}>
                      <Image source={{ uri: img.uri }} style={styles.imageItem} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.tool}>
              <Text style={styles.title}>wishlist</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wishlistScroll}>
                {renderWishlist(tabIndex)}
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={submitVote}>
              <Text style={styles.submitText}>vote up</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#9c7866"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    margin: 30,
    marginBottom: 10
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginVertical: 10,
    marginLeft: 30,
    gap: 10
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f0f0e5"
  },
  tabButtonActive: {
    backgroundColor: "#f0f0e5"
  },
  tabText: {
    color: "#f0f0e5"
  },
  tabTextActive: {
    color: "#9c7866",
    fontWeight: "bold"
  },
  page: {
    marginTop: 10,
    paddingBottom: 20
  },
  textInput: {
    marginHorizontal: 30,
    minHeight: 80,
    backgroundColor: "rgba(240, 240, 229, 0.1)",
    borderRadius: 8,
    padding: 10,
    color: "#f0f0e5",
    fontSize: 16,
    marginBottom: 10
  },
  tool: {
    marginHorizontal: 30,
    gap: 10,
    marginBottom: 20,
  },
  title: {
    color: '#f0f0e5',
    fontSize: 20,
    fontWeight: 'bold',
  },
  images: {
    flexDirection: 'row',
    gap: 10,
  },
  imageScroll: {
    maxHeight: 100
  },
  imageWrapper: {
    marginRight: 8
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: 8
  },
  wishlistScroll: {
    maxHeight: 120,
  },
  wishlistCard: {
    width: 100,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 10,
  },
  wishlistCardSelected: {
    borderWidth: 1,
    borderColor: "#f0f0e5"
  },
  wishlistImage: {
    width: "100%",
    height: 80
  },
  wishlistInfo: {
    padding: 4,
    backgroundColor: "#85665b"
  },
  wishlistName: {
    color: "#f0f0e5",
    fontSize: 12
  },
  wishlistPrice: {
    color: "#f0f0e5",
    fontSize: 12,
    fontWeight: "bold"
  },
  pickButton: {
    backgroundColor: "rgba(183, 170, 147, 0.5)",
    width: 100,
    height: 100,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: 'center',
  },
  submitButton: {
    marginHorizontal: 30,
    marginTop: 5,
    alignItems: "center",
    backgroundColor: "#f0f0e5",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30
  },
  submitText: {
    color: "#9c7866",
    fontWeight: "bold",
    fontSize: 18
  },
});
