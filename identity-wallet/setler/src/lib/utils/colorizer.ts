import colors from 'tailwindcss/colors';
import stringHash from 'string-hash';

export const defaultPalette = [
  '#3366CC',
  '#DC3912',
  '#FF9900',
  '#109618',
  '#990099',
  '#3B3EAC',
  '#0099C6',
  '#DD4477',
  '#66AA00',
  '#FF0099',
  '#B82E2E',
  '#316395',
  '#994499',
  '#22AA99',
  '#AACA51',
  '#6633CC',
  '#F67370',
  '#8B0707',
  '#329262',
  '#5574A6',
  '#3B3EAC',
];

[
  'red',
  'blue',
  'green',
  'yellow',
  'pink',
  'amber',
  'purple',
  'sky',
  'indigo',
  'rose',
  'slate',
].forEach((color) => {
  Object.values(colors[color]).forEach((value, index) => {
    if (index > 2 && index < 9 && index % 2 === 0) {
      // console.log(index, color, value);
      defaultPalette.push(value);
    }
  });
});

// for any text, always return a consistent color
export function colorizer(name: string, palette: string[] = defaultPalette) {
  name = (name || '??').toLowerCase();
  // console.log((Math.abs(stringHash(name)) % palette.length), stringHash(name), name, palette.length);
  return palette[stringHash(name) % palette.length];
}
