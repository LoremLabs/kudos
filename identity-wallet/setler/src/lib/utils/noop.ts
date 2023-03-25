const noop = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

export { noop };
