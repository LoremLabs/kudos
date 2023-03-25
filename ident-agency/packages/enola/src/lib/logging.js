// @ts-check
import pino from 'pino';

/**
 * @typedef {Parameters<typeof pino>[0]} Options
 * @type {Options}
 */
const pinoConfig = {
	// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
	customLevels: {
		log: 0, // DEFAULT
		debug: 100,
		info: 200, // INFO
		notice: 300,
		warn: 400, // WARNING
		error: 500,
		critical: 600,
		alert: 700,
		emergency: 800
	},
	useOnlyCustomLevels: true,
	level: process.env.LOG_LEVEL || 'log',
	messageKey: 'message',
	timestamp: false,
	formatters: {
		level(label) {
			// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
			switch (label) {
				case 'log':
					return { severity: 'DEFAULT' };
				case 'warn':
					return { severity: 'WARNING' };
				default:
					return { severity: label.toUpperCase() };
			}
		},
		// don't print pid, host etc
		bindings() {
			return {};
		},
		log(obj) {
			return obj;
		}
	},
	serializers: {
		error: pino.stdSerializers.err,
		req: pino.stdSerializers.req,
		err: pino.stdSerializers.err
	},
	hooks: {
		// flip call signature from log(obj, msg) to log(msg, obj)
		logMethod(inputArgs, method) {
			if (inputArgs.length >= 2) {
				const arg1 = inputArgs.shift();
				const arg2 = inputArgs.shift();
				return method.apply(this, [arg2, arg1, ...inputArgs]);
			}
			return method.apply(this, inputArgs);
		}
	}
};

if (process.env.LOG_PRETTY === 'true') {
	pinoConfig.transport = {
		target: 'pino-pretty',
		options: {
			levelFirst: true,
			colorize: true,
			messageKey: pinoConfig.messageKey,
			levelKey: 'severity'
		}
	};
}

const Pino = pino(pinoConfig);

export default Pino;
