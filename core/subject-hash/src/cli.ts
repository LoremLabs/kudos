#!/usr/bin/env node

/**
 * subject-hash CLI
 *
 * Examples:
 *   subject-hash email:user@example.com
 *   subject-hash --hex email:user@example.com
 *   echo email:user@example.com | subject-hash
 *   subject-hash --json email:user@example.com
 */

import { getSubjectHash } from './index.js';

type Format = 'base64url' | 'hex' | 'bigint';
type OutputMode = 'plain' | 'json';

function usage(exitCode = 0) {
	const msg = `
Usage:
  subject-hash [options] [subject]

Options:
  --base64url        Output base64url (default)
  --hex             Output hex
  --bigint          Output bigint
  --json            Output JSON object
  --help            Show help

Examples:
  subject-hash email:user@example.com
  subject-hash --hex email:user@example.com
  echo email:user@example.com | subject-hash
  subject-hash --json email:user@example.com
`.trim();
	(exitCode === 0 ? console.log : console.error)(msg);
	process.exit(exitCode);
}

function parseArgs(argv: string[]) {
	let format: Format = 'base64url';
	let mode: OutputMode = 'plain';
	let subject: string | undefined;

	for (const arg of argv) {
		if (arg === '--help' || arg === '-h') usage(0);
		else if (arg === '--json') mode = 'json';
		else if (arg === '--hex') format = 'hex';
		else if (arg === '--bigint') format = 'bigint';
		else if (arg === '--base64url') format = 'base64url';
		else if (arg.startsWith('-')) {
			console.error(`Unknown option: ${arg}`);
			usage(2);
		} else if (!subject) {
			subject = arg;
		} else {
			console.error(`Unexpected argument: ${arg}`);
			usage(2);
		}
	}

	return { format, mode, subject };
}

async function readStdin(): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = '';
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', (chunk) => (data += chunk));
		process.stdin.on('end', () => resolve(data));
		process.stdin.on('error', reject);
	});
}

async function main() {
	const { format, mode, subject: argSubject } = parseArgs(process.argv.slice(2));

	let subject = argSubject;

	// If no subject arg, try stdin (pipeline-friendly)
	if (!subject) {
		// If running interactively with no stdin piped, show usage
		if (process.stdin.isTTY) usage(2);

		const stdin = (await readStdin()).trim();
		if (!stdin) usage(2);
		const lines = stdin.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
		for (const line of lines) {
			outputHash(line, format, mode);
		}
		return;
	}

	outputHash(subject, format, mode);
}

function outputHash(subject: string, format: Format, mode: OutputMode) {
	try {
		let hash: string;
		if (format === 'bigint') {
			const value = getSubjectHash(subject, 'bigint');
			hash = value.toString();
		} else if (format === 'hex') {
			hash = getSubjectHash(subject, 'hex');
		} else {
			hash = getSubjectHash(subject, 'base64url');
		}

		if (mode === 'json') {
			process.stdout.write(JSON.stringify({ subject, format, hash }) + '\n');
		} else {
			process.stdout.write(hash + '\n');
		}
	} catch (err: any) {
		const message = err?.message ? String(err.message) : String(err);
		process.stderr.write(`Error: ${message}\n`);
		process.exit(1);
	}
}

main().catch((err) => {
	const message = err?.message ? String(err.message) : String(err);
	process.stderr.write(`Fatal: ${message}\n`);
	process.exit(1);
});
