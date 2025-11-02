import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Wish() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const productParam = params.product;
    const productString = Array.isArray(productParam) ? productParam[0] : productParam;
    const product = productString ? JSON.parse(productString) : null;
    const { id } = useLocalSearchParams();

    useEffect(() => {
        const fetchWishDetail = async () => {
            const { data, error } = await supabase
                .from('wishlist')
                .select('*')
                .eq('id', id)
                .single();

            if (!error && data) {
                setWish(data);
                console.log('불러온 데이터:', data);
            }
        };

        fetchWishDetail();
    }, [id]);

    if (!product) {
        return (
            <View style={styles.container}>
                <Text style={styles.info}>상품 정보가 없습니다.</Text>
            </View>
        );
    }

    const handleDelete = async () => {
        Alert.alert("위시 삭제", "정말 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            {
                text: "확인",
                onPress: async () => {
                    if (!product?.id) {
                        console.error('삭제할 아이디가 없습니다.');
                        return;
                    }

                    const id = product.id;

                    const { error } = await supabase
                        .from('wishlist')
                        .delete()
                        .eq('id', id);

                    if (error) {
                        console.error('삭제 실패:', error);
                    } else {
                        router.back();
                    }
                },
            },
        ]);
    };
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <AntDesign name="left" size={30} color="#f0f0e5" />
                </TouchableOpacity>
            </View>

            <View style={styles.main}>
                {product.image && <Image source={{ uri: product.image }} style={styles.image} />}
                <Text style={styles.text}>{product.store}</Text>
                <Text style={styles.text}>{product.brand}</Text>
                <Text style={styles.name}>{product.name}</Text>
                <Text style={styles.text}>{product.price}원</Text>
            </View>

            <View style={styles.buttons}>
                <TouchableOpacity onPress={handleDelete}>
                    <Text style={styles.sumitbutton}>담기 취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL(product.url)}>
                    <Text style={styles.sumitButton}>구매하기</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 30,
        backgroundColor: '#9c7866',
        paddingBottom: 0,
        flexDirection: 'column',
        gap: 30,
    },
    info: {
        margin: 'auto',
        color: '#f0f0e5'
    },
    header: {
        flexDirection: 'row',
    },
    main: {
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 10,
    },
    image: {
        width: 250,
        height: 250,
        borderRadius: 15,
        marginBottom: 20,
    },
    text: {
        color: '#f0f0e5',
        fontSize: 18,
    },
    name: {
        marginHorizontal: 20,
        color: '#f0f0e5',
        fontSize: 18,
        textAlign: 'center',
    },
    buttons: {
        marginVertical: 20,
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    sumitbutton: {
        fontSize: 20,
        color: '#9c7866',
        backgroundColor: '#f0f0e5',
        paddingHorizontal: 50,
        paddingVertical: 15,
        borderRadius: 30,
    },
    sumitButton: {
        fontSize: 20,
        color: '#f0f0e5',
        backgroundColor: '#b7aa93',
        paddingHorizontal: 50,
        paddingVertical: 15,
        borderRadius: 30,
    },
});


function setWish(data: any) {
    throw new Error('Function not implemented.');
}

