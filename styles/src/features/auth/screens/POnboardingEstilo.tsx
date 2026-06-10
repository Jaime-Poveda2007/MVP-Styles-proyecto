import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import OnboardingEstilo from '../onboarding/OnboardingEstilo';

type Props = NativeStackScreenProps<AuthStackParamList, 'OnboardingEstilo'>;

export default function POnboardingEstilo({ route, navigation }: Props) {
  const { userId } = route.params;

  const handleComplete = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return <OnboardingEstilo userId={userId} onComplete={handleComplete} />;
}
