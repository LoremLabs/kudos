import UuidEncoder from "uuid-encoder";
import { v1 as uuid } from "uuid";

const encoder = new UuidEncoder("base58");

export const shortId = () => encoder.encode(uuid());
export const shortIdFromUuid = (uuid) => encoder.encode(uuid);
export const uuidV1 = () => uuid();
