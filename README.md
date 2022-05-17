[![hardhat](https://hardhat.org/hardhat-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-insight

Prints contract details based on the source-mapping with Hardhat

[Hardhat-Insight](http://hardhat.org) plugin example.

## What

This plugin read the compiler output and prints the size used by each routine and the gas used.

## Installation

```bash
npm install hardhat-insight
```

And add the following statement to your `hardhat.config.ts`:

```ts
import "hardhat-insight";
```

## Required plugins

Nothing required

## Tasks

This plugin adds the `insight` task to Hardhat, execute it to get contract detailed information.

## Usage

You can select which contracts to print by passing the `--only` argument or you can exclude some contracts
using `--except`.

There are no additional steps you need to take for this plugin to work.

