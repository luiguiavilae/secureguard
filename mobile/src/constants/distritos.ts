// Distritos de Lima Metropolitana con coordenadas centrales aproximadas
export const DISTRITOS_LIMA = [
  { id: 'miraflores', name: 'Miraflores', lat: -18.1209, lng: -70.2842 },
  { id: 'san_isidro', name: 'San Isidro', lat: -12.1000, lng: -77.0353 },
  { id: 'san_borja', name: 'San Borja', lat: -12.1014, lng: -76.9965 },
  { id: 'surco', name: 'Santiago de Surco', lat: -12.1508, lng: -76.9969 },
  { id: 'barranco', name: 'Barranco', lat: -12.1453, lng: -77.0219 },
  { id: 'la_molina', name: 'La Molina', lat: -12.0813, lng: -76.9441 },
  { id: 'surquillo', name: 'Surquillo', lat: -12.1153, lng: -77.0069 },
  { id: 'lince', name: 'Lince', lat: -12.0842, lng: -77.0358 },
  { id: 'jesus_maria', name: 'Jesús María', lat: -12.0747, lng: -77.0469 },
  { id: 'magdalena', name: 'Magdalena del Mar', lat: -12.0883, lng: -77.0711 },
  { id: 'pueblo_libre', name: 'Pueblo Libre', lat: -12.0764, lng: -77.0617 },
  { id: 'san_miguel', name: 'San Miguel', lat: -12.0770, lng: -77.0919 },
  { id: 'lima_cercado', name: 'Lima (Cercado)', lat: -12.0464, lng: -77.0428 },
  { id: 'los_olivos', name: 'Los Olivos', lat: -11.9969, lng: -77.0700 },
  { id: 'san_martin', name: 'San Martín de Porres', lat: -12.0231, lng: -77.0878 },
  { id: 'ate', name: 'Ate', lat: -12.0264, lng: -76.9153 },
  { id: 'san_juan_lurigancho', name: 'San Juan de Lurigancho', lat: -11.9803, lng: -76.9886 },
  { id: 'chorrillos', name: 'Chorrillos', lat: -12.1697, lng: -77.0203 },
  { id: 'villa_el_salvador', name: 'Villa El Salvador', lat: -12.2125, lng: -76.9314 },
  { id: 'callao', name: 'Callao', lat: -12.0561, lng: -77.1183 },
] as const;

export type DistritoId = typeof DISTRITOS_LIMA[number]['id'];
