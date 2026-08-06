#!/usr/bin/env node
const { execSync } = require('child_process');
const readline = require('readline');

function run(command, options = {}) {
  const result = execSync(command, {
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });

  if (result === undefined || result === null) {
    return '';
  }

  return String(result).trim();
}

function commandExists(command) {
  try {
    run(`${command} --version`, { capture: true });
    return true;
  } catch {
    return false;
  }
}

function hasWorkingTreeChanges() {
  return run('git status --porcelain', { capture: true }).length > 0;
}

function currentBranch() {
  return run('git rev-parse --abbrev-ref HEAD', { capture: true });
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWorkflow(tag) {
  // Wait for GitHub to register the release workflow run for this tag.
  console.log(`\nWaiting for Release workflow on ${tag}...`);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const json = run(
      `gh run list --workflow release.yml --branch ${tag} --limit 1 --json databaseId,status,conclusion,headBranch`,
      { capture: true }
    );

    const runs = JSON.parse(json);
    const runInfo = runs[0];

    if (runInfo && runInfo.headBranch === tag) {
      if (runInfo.status === 'completed') {
        if (runInfo.conclusion === 'success') {
          console.log('Release workflow succeeded.');
          return;
        }

        throw new Error(
          `Release workflow completed with conclusion: ${runInfo.conclusion}`
        );
      }

      console.log(`Workflow status: ${runInfo.status}. Waiting...`);
    } else {
      console.log('Workflow run not visible yet. Waiting...');
    }

    await wait(10000);
  }

  throw new Error('Timed out waiting for Release workflow to complete.');
}

async function main() {
  try {
    if (!commandExists('gh')) {
      throw new Error(
        'GitHub CLI is required. Install it from https://cli.github.com/ and run gh auth login.'
      );
    }

    console.log('Checking GitHub auth...');
    run('gh auth status');

    const branch = currentBranch();
    if (branch === 'HEAD') {
      throw new Error('Detached HEAD is not supported for releases.');
    }

    if (hasWorkingTreeChanges()) {
      const message = await ask('Commit message: ');
      if (!message) {
        throw new Error('Commit message is required when changes are present.');
      }

      console.log('\nStaging changes...');
      run('git add -A');

      console.log('Committing...');
      run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    } else {
      console.log('No uncommitted changes detected. Continuing with release.');
    }

    console.log('\nRunning checks...');
    run('npm run typecheck');
    run('npm test');

    console.log('\nBumping patch version and creating tag...');
    const tag = run('npm version patch -m "chore(release): %s"', { capture: true });

    console.log(`Created ${tag}`);

    console.log('Pushing branch and tags...');
    run(`git push origin ${branch}`);
    run('git push origin --tags');

    console.log('Creating GitHub release...');
    run(`gh release create ${tag} --verify-tag --generate-notes --latest`);

    await waitForWorkflow(tag);

    console.log(`\nRelease complete: ${tag}`);
  } catch (error) {
    console.error(`\nRelease failed: ${error.message}`);
    process.exit(1);
  }
}

main();
