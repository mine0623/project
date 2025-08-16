import React, { useState, useEffect, useRef } from "react";
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
};

export default function WishList() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [link, setLink] = useState('');
  const [product, setProduct] = useState<ProductType | null>(null);
  const [wishlist, setWishlist] = useState<ProductType[]>([]);
  const slideAnim = useRef(new Animated.Value(MAX_HEIGHT)).current;

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
      const res = await fetch('http://172.30.1.87:3000/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      });

      const data = await res.json();

      const newProduct = {
        store: 'musinsa',
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
    const newProduct = await fetchProductInfo();

    if (!newProduct) {
      alert('상품 정보를 불러오지 못했습니다. URL을 확인해 주세요.');
      return;
    }

    await handleAddToSupabase({ ...newProduct, url: link });
  };

  const handleAddToSupabase = async (productToAdd: ProductType & { url?: string }) => {
    if (!productToAdd) return;

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      alert('로그인이 필요합니다.');
      return;
    }

    const userId = sessionData.session.user.id;
    const { store, brand, name, price, image, url } = productToAdd;

    const { data: insertedData, error } = await supabase
      .from('wishlist')
      .insert([{ store, brand, name, price, image, url, user_id: userId }])
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


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>wishlist</Text>
        <TouchableOpacity style={styles.addbutton} onPress={openSheet}>
          <Text style={styles.addtext}>add</Text>
          <Ionicons name="add" size={15} color="#f0f0e5" />
        </TouchableOpacity>
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

                <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                  <Text style={styles.addText}>add</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>


      <FlatList
        data={wishlist}
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
              <Text>{item.name}</Text>
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
  addbutton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#b7aa93',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  addtext: {
    color: '#f0f0e5',
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
  addButton: {
    backgroundColor: '#b7aa93',
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
    backgroundColor: 'rgba(240, 240, 229, 0.3)',
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
})