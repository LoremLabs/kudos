import { createHash } from "crypto";

export function getSubjectHash(subject: string): string;
export function getSubjectHash(subject: string, output: "base64url"): string;
export function getSubjectHash(subject: string, output: "hex"): string;
export function getSubjectHash(subject: string, output: "bigint"): bigint;

export function getSubjectHash(
  subject: string,
  output: "base64url" | "hex" | "bigint" = "base64url"
): string | bigint {

  subject = String(subject).trim();

  const hash = createHash("sha256").update(subject).digest();
  const truncated = hash.subarray(0, 16); // 128 bits

  if (output === "hex") {
    return truncated.toString("hex");
  }

  if (output === "bigint") {
    return BigInt("0x" + truncated.toString("hex"));
  }

  return Buffer.from(truncated).toString("base64url");
}
