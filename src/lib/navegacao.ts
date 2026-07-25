/** Links de navegação para endereço de texto (Salvador / Brasil) */
export function linkGoogleMaps(endereco: string): string {
  const q = encodeURIComponent(`${endereco.trim()}, Salvador, BA, Brasil`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function linkWaze(endereco: string): string {
  const q = encodeURIComponent(`${endereco.trim()}, Salvador, BA`);
  return `https://waze.com/ul?q=${q}&navigate=yes`;
}
