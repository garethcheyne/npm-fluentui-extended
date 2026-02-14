#!/usr/bin/env node
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Commit message: ', (message) => {
  rl.close();
  
  if (!message.trim()) {
    console.error('Commit message is required');
    process.exit(1);
  }
  
  try {
    console.log('\nStaging changes...');
    execSync('git add -A', { stdio: 'inherit' });
    
    console.log('Committing...');
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
    
    console.log('Bumping version...');
    execSync('npm version patch', { stdio: 'inherit' });
    
    console.log('Pushing to remote...');
    execSync('git push && git push --tags', { stdio: 'inherit' });
    
    console.log('\nRelease complete!');
  } catch (error) {
    console.error('Release failed:', error.message);
    process.exit(1);
  }
});
