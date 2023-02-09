[hardhat](https://hardhat.org)

# hardhat-insight

Prints contract details based on the source-mapping (compiler AST output) with Hardhat

[Hardhat-Insight](http://hardhat.org) plugin example.

## What

This plugin has two uses:
- read the compiler output and prints the size used by each routine and and estimate of the gas used.
- compare the storage slots of different contracts
(similar to [Storage Layout Plugin](https://www.npmjs.com/package/hardhat-storage-layout) based on the AST so it can
support old solidity versions ( <0.5.13 )

## Installation

```bash
npm install hardhat-insight
```

And add the following statement to your `hardhat.config.js`:

```ts
import "hardhat-insight";
```

## Required plugins

Nothing required

## Tasks

This plugin adds the following tasks to Hardhat:
- `insight`: execute it to get contract detailed information.
- `checkStorage`: check the storage differences between contracts.

## Usage

You can select which contracts to print by passing the `--only` argument or you can exclude some contracts
using `--except`.

There are no additional steps you need to take for this plugin to work.

