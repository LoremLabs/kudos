//
// the only gotcha here is that if you're using a class for the first time here it will get tree-shaken
// so you need to use it at least once in the codebase to make sure it's included in the final bundle
// this is a limitation of the current implementation of the tailwindcss plugin

export const buttonColorClass = ({ color, text, border }) => {
  color = color || 'gray';
  text = text || 'white';
  border = border || 'gray';
  return `cursor-pointer rounded-full border border-${border}-300 bg-${color}-700 py-2 px-4 text-sm font-medium text-${text} shadow-sm transition delay-150 ease-in-out hover:bg-${color}-700 focus:outline-none focus:ring-2 focus:ring-${color}-500 focus:ring-offset-2`;
};

export const buttonClass = buttonColorClass({
  border: 'gray',
  color: 'blue',
  text: 'white',
});

export const buttonInactiveClass =
  'cursor-pointer rounded-full border border-gray-300 bg-gray-700 py-2 px-4 text-sm font-medium text-white shadow-sm transition delay-150 ease-in-out hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2';
