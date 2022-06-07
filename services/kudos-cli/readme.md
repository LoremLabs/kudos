# kudos-cli

> kudos: funding open source CLI

# Install CLI Tool

The `kudos` command line tool can be installed with:

```
% npm install -g kudos-cli
```

Once installed you can play with the echo service:

```
% kudos run echo --hello world
```

## Usage

```
$ kudos --help

  Usage
    $ kudos [input]

  Options
    --debug=[bool]  [Default: false]

  Examples
    $ kudos

    Config
    $ kudos config get
    $ kudos config set key.subkey val
    $ kudos config set arrayKey val1 val2 --array
    $ kudos config del key

    Run Commands
    $ kudos run [command name] [...command params]

```
