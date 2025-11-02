import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
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
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [sortOption, setSortOption] = useState<"latest" | "priceHigh" | "priceLow">("latest");
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
      const res = await fetch('http://172.30.1.79:3000/parse-link', {
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
    if (!link.trim()) {
      alert("URL을 입력해주세요.");
      return;
    }
    const newProduct = await fetchProductInfo();
    if (!newProduct) {
      alert("상품 정보를 가져오지 못했습니다. URL을 확인해주세요.");
      return;
    }
    if (!product?.category) {
      alert("카테고리를 선택해주세요.");
      return;
    }
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
      .select()
      .order('created_at', { ascending: false }); // 최신순

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

  // 탭 필터링
  let filteredWishlist = wishlist.filter(item =>
    selectedTab === "전체" ? true : item.category === selectedTab
  );

  // 정렬 적용
  if (sortOption === "latest") {
    filteredWishlist.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  } else if (sortOption === "priceHigh") {
    filteredWishlist.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortOption === "priceLow") {
    filteredWishlist.sort((a, b) => Number(a.price) - Number(b.price));
  }

  const fixedOrder = ["상의", "하의", "신발", "가방", "악세사리"];
  const existingCategories = fixedOrder.filter(cat =>
    wishlist.some(item => item.category === cat)
  );
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

      {/* 정렬 버튼 */}
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
          style={[styles.sortButton, sortOption === "priceHigh" && styles.sortSelected]}
          onPress={() => setSortOption("priceHigh")}
        >
          <Text style={[styles.sortText, sortOption === "priceHigh" && styles.sortTextSelected]}>
            가격 높은 순
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortButton, sortOption === "priceLow" && styles.sortSelected]}
          onPress={() => setSortOption("priceLow")}
        >
          <Text style={[styles.sortText, sortOption === "priceLow" && styles.sortTextSelected]}>
            가격 낮은 순
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popup}>
                <Text style={styles.popupText}>wish</Text>
                <View>
                  <Text style={{ marginBottom: 10 }}>상품 URL</Text>
                  <TextInput
                    style={styles.input}
                    value={link}
                    clearButtonMode="while-editing"
                    onChangeText={setLink}
                    autoCapitalize="none"
                  />
                </View>

                <Text>카테고리</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryRow}
                >
                  {["상의", "하의", "신발", "가방", "악세사리"].map((cat) => (
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
                </ScrollView>

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
        contentContainerStyle={{ paddingHorizontal: 5 }}
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
    padding: 30,
    backgroundColor: '#9c7866',
    paddingBottom: 0,
    flexDirection: 'column',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingVertical: 8,
    borderRadius: 20,
  },
  addtext: {
    color: '#9c7866',
    fontSize: 15,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0f0e5'
  },
  tabText: {
    color: '#f0f0e5'
  },
  activeTab: {
    backgroundColor: "#f0f0e5"
  },
  activeTabText: {
    color: "#9c7866",
    fontWeight: 'bold'
  },
  sortContainer: { justifyContent: 'flex-end', flexDirection: "row", gap: 8, marginVertical: 8, },
  sortButton: {},
  sortSelected: {},
  sortText: { color: "rgba(240, 240, 229, 0.5)", },
  sortTextSelected: { color: '#f0f0e5' },
  categoryRow: {
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryButtonSelected: {
    backgroundColor: "#b7aa93"
  },
  categoryText: {},
  categoryTextSelected: {
    color: '#f0f0e5',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  popup: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: '#f0f0e5',
    borderRadius: 15,
    padding: 20,
    gap: 10,
  },
  popupText: {
    fontSize: 20,
  },
  label: {
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f0f0e5'
  },
  addButton: {
    backgroundColor: '#9c7866',
    paddingVertical: 12,
    borderRadius: 20,
  },
  addText: {
    color: '#f0f0e5',
    textAlign: 'center',
    fontSize: 18
  },
  wishItem: {
    flexDirection: 'row',
    backgroundColor: '#f0f0e580',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    alignItems: 'center'
  },
  item: {
    marginHorizontal: 10,
    gap: 5,
  },
  wishImage: {
    width: 80,
    height: 80,
    borderRadius: 12
  },
});
