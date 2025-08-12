import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { InteractionManager } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      router.replace('/intro');  // 여기를 '/intro'로 변경
    });

    return () => task.cancel();
  }, []);

  return null;
}
