const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Base path for Electron files
const ELECTRON_BASE_PATH = path.join(
  __dirname,
  "node_modules",
  "electron",
  "dist"
);

// Ensure `output` is a valid absolute path
const output = path.resolve(process.argv[2] || "electron_build");
if (fs.existsSync(output)) {
  console.log("Removing old build...");
  fs.rmSync(output, { force: true, recursive: true });
}
console.log("Creating directory: " + output);

// Recursive function to copy directories and files
function copyDir(dir_src, dest, dont_include = []) {
  dest = path.resolve(dest);
  fs.mkdirSync(dest, { recursive: true });

  fs.readdirSync(dir_src).forEach((part) => {
    if (dont_include.includes(part)) return;
    const srcPath = path.join(dir_src, part);
    const destPath = path.join(dest, part);

    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Start packaging process
console.log("Packaging the app...");
console.log("Getting base Electron ready...");
copyDir(ELECTRON_BASE_PATH, output);

// Get custom app config ready
console.log("Getting custom app config ready...");
copyDir(__dirname, path.join(output, "resources", "app"), [
  "public",
  "src",
  ".gitignore",
  ".dockerignore",
  "Dockerfile",
  "dockerfile",
  "README.md",
  "electron-build.js",
  ".github",
  ".gitlab",
  ".git",
  "out",
  "ubuntu_build",
  process.argv[2] || "electron_build",
]);

// Build React front-end
console.log("Building Electron UI...");
try {
  execSync("npm run build_front", { stdio: "inherit" });
} catch (error) {
  console.error("❌ Error building front-end:", error.message);
  process.exit(1); // Exit script on error
}

// Move React build output
const buildPath = path.resolve(__dirname, "build");
const resourcesPath = path.join(output, "resources");

if (fs.existsSync(buildPath)) {
  console.log("Copying React build files to resources...");
  copyDir(buildPath, path.join(resourcesPath, "app"));

  // Remove default app if it exists
  const defaultAppPath = path.join(resourcesPath, "default_app.asar");
  if (fs.existsSync(defaultAppPath)) {
    fs.unlinkSync(defaultAppPath);
  }

  // Delete the original build directory
  console.log("Cleaning up build directory...");
  fs.rmSync(buildPath, { recursive: true, force: true });
} else {
  console.warn("⚠️ Build directory does not exist, skipping copy step.");
}
fs.rmSync(path.join(output, "resources", "app", "node_modules", "electron"), {
  recursive: true,
  force: true,
});
const dependencyToDelete = Object.keys(
  JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), { encoding: "utf-8" })
  ).devDependencies
);
dependencyToDelete.forEach((dependency) => {
  try {
    console.log(
      "remouving : ",
      path.join(resourcesPath, "app", "node_modules", dependency)
    );
    fs.rmdirSync(path.join(resourcesPath, "app", "node_modules", dependency), {
      recursive: true,
      force: true,
    });
    console.log("**package :", dependency, " removed!");
  } catch (e) {
    console.log(e);
  }
});
console.log("✅ Packaging complete!");
