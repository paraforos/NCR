import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting ASPIS NCR System setup...");

// Check if package.json exists
if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
  console.error("CRITICAL ERROR: 'package.json' not found!");
  console.error("Please ensure package.json is saved in this directory before running install.js");
  process.exit(1);
}

try {
  console.log("Installing dependencies (this may take a minute)...");
  // Install dependencies using shell execution to ensure path resolution
  execSync('npm install', { stdio: 'inherit', shell: true });

  console.log("Starting development server...");
  console.log("-----------------------------------");
  
  // Use 'npm.cmd' on Windows, 'npm' on Mac/Linux
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  
  const devServer = spawn(npmCmd, ['run', 'dev'], { 
    stdio: 'inherit', 
    shell: true 
  });

  devServer.on('error', (err) => {
    console.error("Failed to start server process:", err);
  });

  devServer.on('close', (code) => {
    if (code !== 0) {
      console.log(`Dev server process exited with code ${code}`);
    }
  });

} catch (error) {
  console.error("Setup failed:", error.message);
  console.log("\nTroubleshooting:");
  console.log("1. Ensure 'package.json' exists in this folder.");
  console.log("2. Try running 'npm install' manually in the command prompt.");
  console.log("3. Try running 'npm run dev' manually in the command prompt.");
}