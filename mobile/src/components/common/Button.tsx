// TODO: Componente Button reutilizable — variantes: primary, secondary, danger, ghost
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled }: ButtonProps) {
  // TODO: Implementar estilos por variante
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Text>{label}</Text>
    </TouchableOpacity>
  );
}
