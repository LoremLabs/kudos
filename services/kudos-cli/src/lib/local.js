const getLocalCommand = (context, task) => {
  // allow for tasks to be defined locally as well as via IPFS
  const taskPath = `cmd.${task}`;
  const data = context.config.get(taskPath);
  return data;
};

export { getLocalCommand };
