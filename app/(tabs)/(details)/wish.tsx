import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { supabase } from '@/lib/supabase';

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
        if (!product?.id) {
            console.error('삭제할 아이디가 없습니다.');
            return;
        }

        const id = product.id;  // 숫자형일 거예요

        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('삭제 실패:', error);
        } else {
            router.replace('/wish');
        }
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
                <Text style={styles.text}>{product.name}</Text>
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
        backgroundColor: '#9c7866',
    },
    info: {
        margin: 'auto',
        color: '#f0f0e5'
    },
    header: {
        margin: 30,
        flexDirection: 'row',
    },
    image: {
        marginBottom: 20,
        width: 250,
        height: 250,
        borderRadius: 10,
    },
    main: {
        alignItems: 'center',
        gap: 7,
    },
    text: {
        color: '#f0f0e5',
        fontSize: 18,
    },
    buttons: {
        marginHorizontal: 20,
        marginVertical: 20,
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    sumitbutton: {
        fontSize: 20,
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

