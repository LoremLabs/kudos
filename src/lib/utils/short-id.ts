import { v1 as uuid } from 'uuid';
import UuidEncoder from 'uuid-encoder';

const encoder = new UuidEncoder('base58');

export const shortId = () => encoder.encode(uuid());
