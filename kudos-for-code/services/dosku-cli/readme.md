# dosku-cli

> dosku: funding open source CLI

_`dosku` is `kudos` rearranged_

## Install CLI Tool

The `dosku` command line tool can be installed with:

```
% npm install -g @kudos-protocol/dosku-cli
```

or used directly

```
% npx @kudos-protocol/dosku-cli@next  ...
```

## Commands

Because kudos can be implemented in multiple ways, this cli is a glue layer to make multiple commands available under the `dosku` command via:

```
% dosku run SUBCOMMAND
```

`dosku` does not come with any subcommands installed by default.

## Usage

```
$ dosku --help

  Usage
    $ dosku [input]

  Options
    --debug=[bool]  [Default: false]

  Examples
    $ dosku
    $ npx dosku

    Run Installed Commands
    $ dosku install [subcommand name] [...subcommand params]
    $ dosku run [subcommand name] [...subcommand params]

    Config
    $ dosku config get
    $ dosku config set key.subkey val
    $ dosku config set arrayKey val1 val2 --array
    $ dosku config del subcommands.thing
```
