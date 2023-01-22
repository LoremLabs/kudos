const basename = (/** @type {string} */ p: string) => {
  if (typeof p !== 'string') {
    return '';
  }
  const parts = p.split('/');
  return parts[parts.length - 1];
};

export { basename };
