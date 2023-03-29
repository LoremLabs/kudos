import { IA_VERSION } from "../protocols";

const TOPIC_HEARTBEAT = `/${IA_VERSION}/heartbeat`;

const topics = [TOPIC_HEARTBEAT];

export { topics, TOPIC_HEARTBEAT };
