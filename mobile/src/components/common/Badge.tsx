// TODO: Componente Badge para insignias de agente — icono, label, colores por tipo
import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  type?: 'gold' | 'silver' | 'bronze' | 'info';
}

export function Badge({ label, type = 'info' }: BadgeProps) {
  // TODO: Implementar estilos por tipo de badge
  return (
    <View>
      <Text>{label}</Text>
    </View>
  );
}
