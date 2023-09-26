import chalk from "chalk";

export const palette = [
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
];

export const paletteSolid = [
  chalk.white.bgRed,
  chalk.white.bgGreen,
  chalk.white.bgYellow,
  chalk.white.bgBlue,
  chalk.white.bgMagenta,
  chalk.white.bgCyan,
  chalk.black.bgWhite,
  chalk.black.bgRed,
  chalk.white.bgRgb(255, 165, 0),
  chalk.white.bgRgb(0, 128, 0),
  chalk.white.bgRgb(255, 255, 0),
  chalk.white.bgRgb(0, 0, 255),
  chalk.white.bgRgb(255, 0, 255),
  chalk.white.bgRgb(0, 255, 255),
  // orange
  chalk.white.bgRgb(255, 165, 0),
  // green
  chalk.white.bgRgb(0, 128, 0),
  // yellow
  chalk.white.bgRgb(255, 255, 0),
  // brown
  chalk.white.bgRgb(165, 42, 42),
  // sky
  chalk.white.bgRgb(135, 206, 235),
  // purple
  chalk.white.bgRgb(128, 0, 128),
  // pink
  chalk.white.bgRgb(255, 192, 203),
  // lime green
  chalk.white.bgRgb(50, 205, 50),
  // dark blue
  chalk.white.bgRgb(0, 0, 128),
  // dark green
  chalk.white.bgRgb(0, 100, 0),
  // dark red
  chalk.white.bgRgb(139, 0, 0),
  // dark purple
  chalk.white.bgRgb(128, 0, 128),
  // dark pink
  chalk.white.bgRgb(255, 20, 147),
];

export const stringToColorBlocks = (str, extra) => {
  let extraShift = 0;
  if (extra) {
    // convert extra into an amount to shift by (for instance to have different colors for different wallets)
    const chars = extra.split("");
    const ascii = chars.map((char) => char.charCodeAt(0));
    extraShift = ascii.reduce((a, b) => a + b, 0);
  }

  const chars = str.split("");

  // map each character to a color
  const colorized = chars.map((char) => {
    let color;
    let shifted = 0;
    let ascii = char.charCodeAt(0);

    // if the character is uppercase, choose a different color
    if (char === char.toUpperCase()) {
      shifted = 3;
    }

    color = paletteSolid[(shifted + extraShift + ascii) % paletteSolid.length];
    return color(" ") + chalk.reset();
  });

  // join the array of colorized characters back into a string
  return colorized.join("");
};

export const colorizeString = (str) => {
  // chalk colors to change each character into a consistent color from that palette

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

    color = palette[(shifted + ascii) % palette.length];
    return color(char) + chalk.reset();
  });

  // join the array of colorized characters back into a string
  return colorized.join("");
};
