import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: '#f0f0e5',
                    tabBarInactiveTintColor: '#9c7866',
                    tabBarStyle: { backgroundColor: '#b7aa93' },
                    headerShown: false,
                }}
            >
                <Tabs.Screen
                    name="post"
                    options={{
                        title: '자유게시판',
                        tabBarShowLabel: false,
                        tabBarItemStyle: {
                            marginTop: 5,
                        },
                        tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses-sharp" size={25} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="wishlist"
                    options={{
                        title: '위시리스트',
                        tabBarShowLabel: false,
                        tabBarItemStyle: {
                            marginTop: 5,
                        },
                        tabBarIcon: ({ color }) => <Ionicons name="bag" size={25} color={color} />,
                    }}
                />
            </Tabs>
        </>
    );
}