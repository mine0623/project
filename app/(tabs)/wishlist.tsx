import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  Animated,
  Image,
  TouchableWithoutFeedback,
  Dimensions,
  FlatList,
  StyleSheet
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

const screenHeight = Dimensions.get('window').height;
const MAX_HEIGHT = screenHeight * 0.8;

type ProductType = {
  id?: number;
  store: string;
  brand?: string | null;
  name: string;
  price: string | number;
  image?: string | null;
  category?: string;
};

export default function WishList() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [link, setLink] = useState('');
  const [product, setProduct] = useState<ProductType | null>(null);
  const [wishlist, setWishlist] = useState<ProductType[]>([]);
  const [selectedTab, setSelectedTab] = useState("전체");
  const slideAnim = useRef(new Animated.Value(MAX_HEIGHT)).current;

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [])
  );

  const openSheet = () => {
    setVisible(true);
    slideAnim.setValue(MAX_HEIGHT);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: MAX_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const fetchProductInfo = async () => {
    if (!link.trim()) return null;

    try {
      const res = await fetch('http://172.30.1.61:3000/parse-link', {  // ← URL 수정 필요
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      });

      const data = await res.json();

      const newProduct = {
        store: data.source || 'unknown',
        brand: data.brand || null,
        name: data.name || '',
        price: data.price?.toString() || '',
        image: data.image || null,
      };

      setProduct(newProduct);
      return newProduct;
    } catch (error) {
      console.error('상품 정보 요청 실패:', error);
      return null;
    }
  };

  const handleAdd = async () => {
    // URL이 없으면 return
    if (!link.trim()) {
      alert("URL을 입력해주세요.");
      return;
    }

    // 크롤링해서 상품 정보 가져오기
    const newProduct = await fetchProductInfo();

    if (!newProduct) {
      alert("상품 정보를 가져오지 못했습니다. URL을 확인해주세요.");
      return;
    }

    // 카테고리 선택 여부 체크
    if (!product?.category) {
      alert("카테고리를 선택해주세요.");
      return;
    }

    // Supabase에 저장
    await handleAddToSupabase({ ...newProduct, url: link, category: product.category });
  };


  const handleAddToSupabase = async (productToAdd: ProductType & { url?: string }) => {
    if (!productToAdd) return;

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      alert('로그인이 필요합니다.');
      return;
    }

    const userId = sessionData.session.user.id;
    const { store, brand, name, price, image, url, category } = productToAdd;

    const { data: insertedData, error } = await supabase
      .from('wishlist')
      .insert([{ store, brand, name, price, image, url, category, user_id: userId }])
      .select();

    if (!error && insertedData) {
      setWishlist(prev => [insertedData[0], ...prev]);
      setLink('');
      setProduct(null);
      closeSheet();
    } else {
      console.error('Supabase 저장 실패:', error?.message);
    }
  };

  const fetchWishlist = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (!error && data) setWishlist(data);
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const filteredWishlist = wishlist.filter(item =>
    selectedTab === "전체" ? true : item.category === selectedTab
  );

  // 고정된 카테고리 순서
  const fixedOrder = ["상의", "하의", "신발", "악세사리"];

  // wishlist에 실제로 존재하는 카테고리만 필터링
  const existingCategories = fixedOrder.filter(cat =>
    wishlist.some(item => item.category === cat)
  );

  // 최종 탭 목록
  const tabs = ["전체", ...existingCategories];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>wishlist</Text>
        <TouchableOpacity style={styles.addbutton} onPress={openSheet}>
          <Text style={styles.addtext}>add</Text>
          <Ionicons name="add" size={15} color="#9c7866" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
          >
            <Text style={selectedTab === tab ? styles.activeTabText : styles.tabText}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popup}>
                <Text style={styles.popupText}>wish</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>URL</Text>
                  <TextInput
                    style={styles.input}
                    value={link}
                    onChangeText={setLink}
                    autoCapitalize="none"
                  />
                </View>

                {/* 카테고리 선택 */}
                <Text style={styles.label}>카테고리</Text>
                <View style={styles.categoryRow}>
                  {["상의", "하의", "신발", "악세사리"].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        product?.category === cat && styles.categoryButtonSelected
                      ]}
                      onPress={() =>
                        setProduct(prev => prev ? { ...prev, category: cat } : { store: "", name: "", price: "", category: cat })
                      }
                    >
                      <Text style={[
                        styles.categoryText,
                        product?.category === cat && styles.categoryTextSelected
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                  <Text style={styles.addText}>add</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <FlatList
        data={filteredWishlist}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.wishItem}
            onPress={() =>
              router.push({
                pathname: '/wish',
                params: { product: JSON.stringify(item) },
              })
            }
          >
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.wishImage} resizeMode="cover" />
            )}
            <View style={styles.item}>
              <Text>{item.store}</Text>
              <Text>{item.brand}</Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ maxWidth: 200 }}
              >
                {item.name}
              </Text>
              <Text>{item.price}원</Text>
              <Text>
                #{item.category}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
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
    marginBottom: 10,
  },
  logo: {
    color: "#f0f0e5",
    fontSize: 30,
    fontWeight: "bold",
  },
  addbutton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0e5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  addtext: {
    color: '#9c7866',
    fontSize: 15,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  popup: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: '#f0f0e5',
    borderRadius: 12,
    padding: 20,
  },
  popupText: {
    fontSize: 20,
    marginBottom: 5
  },
  formGroup: {
    marginBottom: 15
  },
  label: {
    fontSize: 15,
    marginVertical: 10
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f0f0e5'
  },
  categoryRow: { flexDirection: "row", justifyContent: "flex-start", gap: 10, marginBottom: 10, },
  categoryButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, },
  categoryButtonSelected: { backgroundColor: "#b7aa93", borderWidth: 0, },
  categoryText: {},
  categoryTextSelected: { color: '#f0f0e5' },
  addButton: {
    backgroundColor: '#9c7866',
    paddingVertical: 12,
    borderRadius: 10,
  },
  addText: {
    color: '#f0f0e5',
    textAlign: 'center',
    fontSize: 18
  },
  wishItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 240, 229, 0.5)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    alignItems: 'center'
  },
  item: {
    marginLeft: 10,
    gap: 4,
  },
  wishImage: {
    width: 80,
    height: 80,
    borderRadius: 10
  },
  tabContainer: { flexDirection: "row", justifyContent: "flex-start", gap: 10, marginHorizontal: 20, marginTop: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f0f0e5' },
  activeTab: { backgroundColor: "#f0f0e5" },
  tabText: { color: '#f0f0e5' },
  activeTabText: { color: "#9c7866", fontWeight: 'bold' },
});
