import { emojiMap } from '$lib/utils/emoji-map';
import snarkdown from 'snarkdown';

export const renderMessage = (msg) => {
  msg = snarkdown(msg);
  msg = msg.replace(/<a href/g, '<a target="_blank" href');

  // convert :emoji: to <i class="twe twe-emoji"></i>
  // see if we have the :format: for the emoji
  let emojiMatches = msg.match(/:([a-z0-9_+-]+):/g);
  console.log('emojiMatches', emojiMatches);
  if (emojiMatches) {
    emojiMatches.forEach((emoji) => {
      // remove the colons
      emoji = emoji.replace(/:/g, '');
      console.log('emoji', emoji);
      // see if the matching emoji exists in any classes
      if (emojiMap[emoji]) {
        const mappedEmoji = emojiMap[emoji];
        msg = msg.replace(
          `:${emoji}:`,
          `<i class="twe twe-2x twe-${mappedEmoji}"></i>`
        );
      }
    });
  }
  //        msg = msg.replace(/:([a-z0-9_+-]+):/g, `i class="twe twe-${RegExp.$1}"`);

  // convert \n to <br>
  msg = msg.replace(/\n/g, '<br>');
  //msg = '<i class="twe twe-2x twe-folded-hands"></i>'
  return msg;
};
