import chalk from "chalk";

export const colorizeString = (str) => {
  // chalk colors to change each character into a consistent color from that palette

  const colors = [
    chalk.red,
    chalk.green,
    chalk.yellow,
    chalk.blue,
    chalk.magenta,
    chalk.cyan,
    chalk.white,
    chalk.gray,
    chalk.redBright,
    chalk.greenBright,
    chalk.yellowBright,
    chalk.blueBright,
    chalk.magentaBright,
    chalk.cyanBright,
    // chalk.whiteBright,
    // chalk.white.bgRed,
    // chalk.white.bgGreen,
    // chalk.white.bgYellow,
    // chalk.white.bgBlue,
    // chalk.white.bgMagenta,
    // chalk.white.bgCyan,
    // chalk.black.bgWhite,
    // chalk.black.bgRed,
  ];

  // convert the string to an array of characters
  const chars = str.split("");

  // map each character to a color
  const colorized = chars.map((char) => {
    let color;
    let shifted = 0;
    let ascii = char.charCodeAt(0);

    if (char === " ") {
      color = chalk.reset;
    }

    // if the character is uppercase, choose a different color
    if (char === char.toUpperCase()) {
      shifted = 18;
    }

    color = colors[(shifted + ascii) % colors.length];
    return color(char) + chalk.reset();
  });

  // join the array of colorized characters back into a string
  return colorized.join("");
};
