// TODO: Componente Input reutilizable — con label, error state, variante phone/text/numeric
import React from 'react';
import { TextInput, View, Text } from 'react-native';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric' | 'email-address';
  secureTextEntry?: boolean;
}

export function Input({ label, value, onChangeText, placeholder, error, keyboardType }: InputProps) {
  // TODO: Implementar estilos y manejo de error
  return (
    <View>
      {label && <Text>{label}</Text>}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} />
      {error && <Text>{error}</Text>}
    </View>
  );
}
