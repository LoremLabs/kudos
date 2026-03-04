import { z } from "zod";

/**
 * Subject format: `type:id` where type is `[a-z]{1,32}` (lowercase only)
 * and id is 1-254 non-whitespace characters.
 */
const SUBJECT_PATTERN = /^[a-z]{1,32}:\S{1,254}$/;

export const SubjectSchema = z
  .string()
  .regex(SUBJECT_PATTERN, "Invalid subject format. Expected 'type:id' (e.g. 'email:user@example.com').");

export interface ParsedSubject {
  type: string;
  id: string;
}

export function parseSubject(subject: string): ParsedSubject {
  const colonIndex = subject.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid subject: missing ':' separator in '${subject}'`);
  }
  return {
    type: subject.slice(0, colonIndex),
    id: subject.slice(colonIndex + 1),
  };
}
