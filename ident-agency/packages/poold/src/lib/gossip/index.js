import { IdentGossipsub } from "./gossipsub";

export { topics } from "./topics";

export function gossipsub(cfg = {}) {
  return (components) => new IdentGossipsub(components, cfg);
}

export { IdentGossipsub };
