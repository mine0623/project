import React, { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Text,
  StyleSheet
} from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 3000);

    return () => clearTimeout(timer);
  })

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.logo}>mine</Text>
      <Text style={styles.text}>나에게 꼭 맞는 옷을 찾는 패션 커뮤니티 앱</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#9c7866',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 5,
  },
  logo: {
    color: '#f0f0e5',
    fontWeight: 'bold',
    fontSize: 40,
    textAlign: 'center'
  },
  text: {
    color: '#f0f0e5',
    fontSize: 20,
    textAlign: 'center'
  },
})