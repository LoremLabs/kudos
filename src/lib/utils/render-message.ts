import DOMPurify from 'dompurify';
import { emojiMap } from '$lib/utils/emoji-map';
// import { marked } from "marked";
// import markedLinkifyIt from "marked-linkify-it";
import snarkdown from 'snarkdown';

// const schemas = {};
// const options = {};
// marked.use(markedLinkifyIt(schemas, options));
// marked.use(() => {
//   const renderer = new marked.Renderer();
//   renderer.link = (href, title, text) => {
//     return `<a href="${href}" target="_blank" class="bg-red-500 underline" rel="noopener noreferrer">${text}</a>`;
//   }
//   renderer.code = (code, language) => {
//     return `<pre class="code bg-red-100"><code class="language-${language}">${code}</code></pre>`;
//   }

//   return renderer;
// });

export const renderMessage = (msg) => {
  if (!msg) {
    return '';
  }

  // convert < to &lt;
  msg = msg.replace(/</g, '&lt;');
  // convert > to &gt;
  msg = msg.replace(/>/g, '&gt;');

  msg = snarkdown(msg);
  msg = DOMPurify.sanitize(msg);

  // convert http://link.com to <a href="http://link.com">http://link.com</a>
  // see if we have the http://format for the link
  // let linkMatches = msg.match(/(https?:\/\/[^\s]+)/g);

  // if (linkMatches) {
  //   linkMatches.forEach((link) => {
  //     msg = msg.replace(link, `<a href="${link}">${link}</a>`);
  //   });
  // }

  // convert #hashtag to <a href="/hashtag">#hashtag</a>
  // see if we have the #format for the hashtag

  // convert @username to <a href="/username">@username</a>
  // see if we have the @format for the username
  // let usernameMatches = msg.match(/@([a-z0-9_+-]+)/g);

  // open links in system browser
  //msg = msg.replace(/<a href/g, '<a target="_blank" href');

  // convert :emoji: to <i class="twe twe-emoji"></i>
  // see if we have the :format: for the emoji
  let emojiMatches = msg.match(/:([a-z0-9_+-]+):/g);

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

  // convert \n to <br>
  msg = msg.replace(/\n/g, '<br>');
  return msg;
};
