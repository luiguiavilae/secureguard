// TODO: Card de agente en cola de verificación — nombre, teléfono, fecha registro, botón ver
import React from 'react';

interface AgentCardProps {
  agentId: string;
  name: string;
  phone: string;
  registeredAt: string;
  onSelect: (id: string) => void;
}

export function AgentCard({ agentId, name, phone, registeredAt, onSelect }: AgentCardProps) {
  // TODO: Implementar card de agente pendiente
  return <div className="border rounded-lg p-4 cursor-pointer" onClick={() => onSelect(agentId)} />;
}
