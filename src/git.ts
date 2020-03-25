import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { JPCMConfig } from './config';

const verbose = process.argv.find((arg) => arg === '--verbose');
// eslint-disable-next-line max-len
const conventionalCommitRegExp = /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z ]+\)!?)?: ([\w ]+)$/g;

function debug(message: string): void {
  if (!verbose) {
    return;
  }

  console.log(`JIRA prepare commit msg > DEBUG: ${message}`);
}

function getMsgFilePath(index = 0): string {
  debug('getMsgFilePath');

  // Husky stashes git hook parameters $* into a HUSKY_GIT_PARAMS env var.
  const gitParams = process.env.HUSKY_GIT_PARAMS || '';

  // Throw a friendly error if the git params environment variable can't be found – the user may be missing Husky.
  if (!gitParams) {
    throw new Error(`The process.env.HUSKY_GIT_PARAMS isn't set. Is supported Husky version installed?`);
  }

  // Unfortunately, this will break if there are escaped spaces within a single argument;
  // I don't believe there's a workaround for this without modifying Husky itself
  return gitParams.split(' ')[index];
}

function escapeReplacement(str: string): string {
  return str.replace(/[$]/, '$$$$'); // In replacement to escape $ needs $$
}

function replaceMessageByPattern(jiraTicket: string, message: string, pattern: string): string {
  return pattern.replace('$J', escapeReplacement(jiraTicket)).replace('$M', escapeReplacement(message));
}

export type GitRevParseResult = {
  prefix: string;
  gitCommonDir: string;
};

export function gitRevParse(cwd = process.cwd()): GitRevParseResult {
  // https://github.com/typicode/husky/issues/580
  // https://github.com/typicode/husky/issues/587
  const { status, stderr, stdout } = cp.spawnSync('git', ['rev-parse', '--show-prefix', '--git-common-dir'], { cwd });

  if (status !== 0) {
    throw new Error(stderr.toString());
  }

  const [prefix, gitCommonDir] = stdout
    .toString()
    .split('\n')
    .map((s) => s.trim())
    // Normalize for Windows
    .map((s) => s.replace(/\\\\/, '/'));

  return { prefix, gitCommonDir };
}

export function getRoot(): string {
  debug('getRoot');

  const cwd = process.cwd();

  const { gitCommonDir } = gitRevParse(cwd);

  // Git rev-parse returns unknown options as is.
  // If we get --absolute-git-dir in the output,
  // it probably means that an old version of Git has been used.
  // There seem to be a bug with --git-common-dir that was fixed in 2.13.0.
  // See issues above.
  if (gitCommonDir === '--git-common-dir') {
    throw new Error('Husky requires Git >= 2.13.0, please upgrade Git');
  }

  return path.resolve(cwd, gitCommonDir);
}

export async function getBranchName(gitRoot: string): Promise<string> {
  debug('gitBranchName');

  return new Promise((resolve, reject) => {
    cp.exec(`git --git-dir=${gitRoot} symbolic-ref --short HEAD`, { encoding: 'utf-8' }, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }

      if (stderr) {
        return reject(new Error(String(stderr)));
      }

      resolve(String(stdout).trim());
    });
  });
}

export function getJiraTicket(branchName: string, config: JPCMConfig): string {
  debug('getJiraTicket');

  const jiraIdPattern = new RegExp(config.jiraTicketPattern, 'i');
  const matched = jiraIdPattern.exec(branchName);
  const jiraTicket = matched && matched[0];

  if (!jiraTicket) {
    throw new Error('The JIRA ticket ID not found');
  }

  return jiraTicket.toUpperCase();
}

export function writeJiraTicket(jiraTicket: string, config: JPCMConfig): void {
  debug('writeJiraTicket');

  const messageFilePath = getMsgFilePath();
  let message;

  // Read file with commit message
  try {
    message = fs.readFileSync(messageFilePath, { encoding: 'utf-8' });
  } catch (ex) {
    throw new Error(`Unable to read the file "${messageFilePath}".`);
  }

  // ignore everything after commentChar or the scissors comment, which present when doing a --verbose commit,
  // or `git config commit.status true`
  const messageSections = message.split('------------------------ >8 ------------------------')[0];
  const lines = messageSections
    .trim()
    .split('\n')
    .map((line) => line.trimLeft())
    .filter((line) => line.startsWith(config.commentChar));

  if (!lines.length) {
    return;
  }

  if (config.isConventionalCommit) {
    // In the first line should be special conventional format
    const firstLine = lines[0];
    if (conventionalCommitRegExp.exec(firstLine)) {
      const [, type, scope, msg] = firstLine.match(conventionalCommitRegExp) ?? [];
      lines[0] = `${type}${scope}: ${replaceMessageByPattern(jiraTicket, msg, config.messagePattern)}`;
    }
  } else {
    // Add jira ticket into the message in case of missing
    if (lines.every((line) => !line.includes(jiraTicket))) {
      lines[0] = replaceMessageByPattern(jiraTicket, lines[0], config.messagePattern);
    }
  }

  // Write message back to file
  try {
    fs.writeFileSync(messageFilePath, lines.join('\n'), { encoding: 'utf-8' });
  } catch (ex) {
    throw new Error(`Unable to write the file "${messageFilePath}".`);
  }
}
