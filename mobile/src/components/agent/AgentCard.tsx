// TODO: Card de agente para lista — foto, nombre, rating, badges, precio/hora, botón ver perfil
import React from 'react';
import { View } from 'react-native';

interface AgentCardProps {
  agentId: string;
  name: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  onPress: () => void;
}

export function AgentCard({ agentId, name, rating, reviewCount, hourlyRate, onPress }: AgentCardProps) {
  // TODO: Implementar card de agente
  return <View />;
}
