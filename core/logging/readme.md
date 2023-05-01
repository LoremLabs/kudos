# Logging

## Overview

This is a helper library for logging, a wrapper around [pino](https://github.com/pinojs/pino).

Likely you won't want to use this directly, but it's used as part of other [@kudos-protocol](https://www.npmjs.com/search?q=%40kudos-protocol) libraries.

## Usage

```javascript
import log from '@kudos-protocol/logging';

log.info('Hello World');
```

## Configuration

The logger can be configured by setting the following environment variables:

| Variable   | Description                       | Default |
| ---------- | --------------------------------- | ------- |
| LOG_LEVEL  | The log level.                    | info    |
| LOG_PRETTY | Whether to pretty print the logs. | false   |
