import ora from "ora";
import spinners from "cli-spinners";

export const waitFor = (promise, options) => {
  // await waitFor(promise, { text: 'Loading unicorns', spinner: spinners.dots });

  const spinner = ora({
    text: "Processing...",
    spinner: spinners.earth,
    ...options,
  });
  spinner.start();
  promise.then(
    () => {
      spinner.succeed();
    },
    () => {
      spinner.fail();
    }
  );
  return promise;
};
