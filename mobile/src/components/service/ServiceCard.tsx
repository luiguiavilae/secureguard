// TODO: Card de servicio — tipo, estado, fecha, agente asignado, precio
import React from 'react';
import { View, Text } from 'react-native';

interface ServiceCardProps {
  serviceId: string;
  type: string;
  status: string;
  date: string;
  onPress: () => void;
}

export function ServiceCard({ serviceId, type, status, date, onPress }: ServiceCardProps) {
  // TODO: Implementar card de servicio
  return <View />;
}
