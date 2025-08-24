import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#f0f0e5',
                tabBarInactiveTintColor: 'rgba(156, 120, 102, 0.5)',
                tabBarStyle: { backgroundColor: '#b7aa93' },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="wishlist"
                options={{
                    title: '위시리스트',
                    tabBarShowLabel: false,
                    tabBarItemStyle: { marginTop: 5 },
                    tabBarIcon: ({ color }) => <Ionicons name="bag" size={25} color={color} />,
                }}
            />
            <Tabs.Screen
                name="postlist"
                options={{
                    title: '자유게시판',
                    tabBarShowLabel: false,
                    tabBarItemStyle: { marginTop: 5 },
                    tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses-sharp" size={25} color={color} />,
                }}
            />
            <Tabs.Screen
                name="vote"
                options={{
                    title: '투표',
                    tabBarShowLabel: false,
                    tabBarItemStyle: { marginTop: 5 },
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="vote" size={25} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: '프로필',
                    tabBarShowLabel: false,
                    tabBarItemStyle: { marginTop: 5 },
                    tabBarIcon: ({ color }) => <Ionicons name="person-sharp" size={25} color={color} />,
                }}
            />
        </Tabs>
    );
}
