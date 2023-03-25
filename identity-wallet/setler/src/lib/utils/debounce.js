let inDebounce;

export const debounce = (func, delay) => {
  return function () {
    const _this = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(_this, args), delay);
  };
};
