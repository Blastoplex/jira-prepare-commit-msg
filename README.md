# jira-prepare-commit-msg
[![Downloads](https://img.shields.io/npm/dm/jira-prepare-commit-msg)](https://www.npmjs.com/package/jira-prepare-commit-msg)
[![MIT license](https://img.shields.io/npm/l/jira-prepare-commit-msg)](http://opensource.org/licenses/MIT)

The husky command to add JIRA ticket ID into the commit message if it is missed.

The JIRA ticket ID is taken from a git branch name.

## Why?

Installing Jira prepare commit msg hook into your project will mean everyone contributing code to your project will automatically tag each commit with
it's associated issue key based off the branch name. 

So if your branch name is `feature/TEST-123-new-feature`, then when you commit with a message `"initial commit"` it will automatically become `"[TEST-123] initial commit"`.

Why would you want this? Well, Jira has many hidden goodies, and this is one of them! If you include an issue key in your commit messages AND you have your deployment pipeline connected to Jira this will unlock many bonus features, such as the Deployments view, Cycle time report, Deployment frequency report and I've heard many more features are coming soon!

## Installation

Install the package using NPM

```bash
npm install husky jira-prepare-commit-msg --save-dev && npx husky install
```

For Husky 5:

Execute command

```shell
npx husky add .husky/prepare-commit-msg 'npx jira-prepare-commit-msg $1'
```

For Husky 2-4:

Inside your package.json add a standard husky npm script for the git hook

```json
{
  "husky": {
    "hooks": {
      "prepare-commit-msg": "jira-prepare-commit-msg"
    }
  }
}
```

## Configuration

Starting with v1.3 you can now use different ways of configuring it:

* `jira-prepare-commit-msg` object in your `package.json`
* `.jirapreparecommitmsgrc` file in JSON or YML format
* `jira-prepare-commit-msg.config.js` file in JS format

See [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) for more details on what formats are supported.

#### `package.json` example:

```json
{
  "jira-prepare-commit-msg": {
    "messagePattern": "[$J]\n$M",
    "jiraTicketPattern": "([A-Z]+-\\d+)",
    "commentChar": "#",
    "isConventionalCommit": false,
    "allowEmptyCommitMessage": false
  }
}
```

#### Supported message pattern

`jira-prepare-commit-msg` supports special message pattern to configure where JIRA ticket number will be inserted. 
* Symbols `$J` will be replaced on JIRA ticket number
* Symbols `$M` will be replaced on commit message.
 
Pattern `[$J]\n$M` is currently supported by default. 

```json
{
  "jira-prepare-commit-msg": {
    "messagePattern": "[$J]\n$M"
  }
}
```

##### Examples

* `[$J] $M`
* `[$J]-$M`
* `$J $M`

**NOTE:** the supplied commit message will be cleaned up by `strip` mode.

#### Supported JIRA ticket pattern

`jira-prepare-commit-msg` allows using custom regexp string pattern to search JIRA ticket number.

Pattern `([A-Z]+-\\d+)` is currently supported by default. 

**NOTE:** to search JIRA ticket pattern flag `i` is used: `new RegExp(pattern, i')`  

```json
{
  "jira-prepare-commit-msg": {
    "jiraTicketPattern": "([A-Z]+-\\d+)"
  }
}
```

#### Git comment char

Git uses `#` by default to comment lines in the commit message. If default char was changed `jira-prepare-commit-msg` can allow set it.

```json
{
  "jira-prepare-commit-msg": {
    "commentChar": "#"
  }
}
```

#### Allow empty commit message

The commit message might be empty after cleanup or using `-m ""`, `jira-prepare-commit-msg` might insert the JIRA ticket number anyway if this flag is set.

```json
{
  "jira-prepare-commit-msg": {
    "allowEmptyCommitMessage": true
  }
}
```

#### Conventional commit

`jira-prepare-commit-msg` supports [conventional commit](https://www.conventionalcommits.org). To insert JIRA
ticket number to the description set the following setting:

```json
{
  "jira-prepare-commit-msg": {
    "isConventionalCommit": true
  }
}
```

**NOTE:** For description will be applied `messagePattern`

##### Examples

If the configuration is:

```json
{
  "jira-prepare-commit-msg": {
    "messagePattern": "[$J] $M",
    "isConventionalCommit": true
  }
}
``` 

and commit message is `fix(test)!: important changes` then at result will be `fix(test)!: [JIRA-1234] important changes`

## TODO

- [X] Don't double tag if there's already an issue key in the message
- [] Hard fail if there's no issue key in branch name or message, suggesting to use --no-verify

## License

MIT
