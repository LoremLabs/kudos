import get from 'lodash.get';
import dns2 from "dns2";
const { Packet } = dns2;

import mappings from "./mappings.js";

const log = console.log;

const handle = (request, send, { flags }) => {

  const debug = (a,b) => {
    flags.debug && log(a,b);
  };
  
  const response = Packet.createResponseFromRequest(request);
  const [question] = request.questions;
  const { name, type } = question;

  debug({ question, name, type });

  if (name.startsWith("_kudos.")) {
    // eslint-disable-next-line no-unused-vars
    const [_kudos, target] = name.toLowerCase().split(".");

    debug('n', { target, name });

    if (type === Packet.TYPE.TXT) {
      const answer = lookup(name, 'txt');
      if (answer !== undefined) {
        debug("found mapping", target);
        response.answers.push({
          name,
          type: Packet.TYPE.TXT,
          class: Packet.CLASS.IN,
          ttl: flags.ttl,
          data: answer
        });
      } else {
        debug("no mapping found", JSON.stringify({ target, answer, mappings }));
        const DEV_FORCE_ANSWER = true;
        if (DEV_FORCE_ANSWER) {
          debug("returning hardcoded answer");
          response.answers.push({
            name,
            type: Packet.TYPE.TXT,
            class: Packet.CLASS.IN,
            ttl: flags.ttl,
            data: 'rrrrrrrrrrrrrrrrrrrrBZbvji'
          });
        }
      }
    }
  }

  send(response);
};

const lookup = (target, type) => {

  // target = hostname.subdomain.domain.tld

  const tree = `${type}.${target.split('.').reverse().join('.')}`;
  log('tree', tree);
  const answer = get(mappings, tree, undefined);

  return answer;
};

export default handle;
