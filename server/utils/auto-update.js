const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const REPO_PATH = process.env.GITHUB_REPO || 'IN3PIRE/LavaPanel';
const UPDATE_INTERVAL = parseInt(process.env.AUTO_UPDATE_INTERVAL) || 3600000;

const getCurrentVersion = async () => {
  try {
    const { stdout } = await new Promise((resolve, reject) => {
      exec('git rev-parse HEAD', (err, stdout) => err ? reject(err) : resolve({ stdout }));
    });
    return stdout.trim();
  } catch (error) {
    return null;
  }
};

const getLatestVersion = async () => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${REPO_PATH}/commits/main`
    );
    return response.data.sha;
  } catch (error) {
    console.error('Failed to fetch latest version:', error.message);
    return null;
  }
};

const updatePanel = async () => {
  console.log('🔄 Checking for updates...');

  const currentVersion = await getCurrentVersion();
  const latestVersion = await getLatestVersion();

  if (!currentVersion || !latestVersion) {
    console.log('⚠️  Cannot check version, skipping update');
    return;
  }

  if (currentVersion === latestVersion) {
    console.log('✅ Already up to date');
    return;
  }

  console.log('🆕 Update available! Updating...');

  return new Promise((resolve, reject) => {
    exec('git fetch origin main && git reset --hard origin/main && npm install', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Update failed:', error.message);
        return reject(error);
      }

      if (stderr) {
        console.error('Update stderr:', stderr);
      }

      console.log('✅ Update completed successfully!');
      console.log(stdout);
      resolve();
    });
  });
};

const start = () => {
  console.log('🔄 Auto-update checker started');
  
  updatePanel().catch(console.error);
  
  setInterval(() => {
    updatePanel().catch(console.error);
  }, UPDATE_INTERVAL);
};

module.exports = { start, updatePanel, getCurrentVersion, getLatestVersion };
