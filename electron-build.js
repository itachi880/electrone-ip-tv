const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Base path for Electron files
const ELECTRON_BASE_PATH = path.join(
  __dirname,
  "node_modules",
  "electron",
  "dist"
);

const install_linux_bash = ({ short_cut_name }) => `#!/bin/bash

# Variables
INSTALL_DIR="/opt/${short_cut_name.replaceAll(
  " ",
  "_"
)}"  # Path where we want to install the app
DESKTOP_DIR="/home/$(logname)/Desktop"  # Desktop path
APP_NAME="${short_cut_name}"  # Name of the app
DESKTOP_FILE_NAME="${short_cut_name.replaceAll(
  " ",
  "_"
)}.desktop"  # Name of the .desktop file
ICON_PATH="/opt/ip-tv/resources/icon.png"  # Path to the app icon (optional)

# Step 1: Install files to the desired directory
echo "Installing files to $INSTALL_DIR..."

# Create the installation directory if it doesn't exist
sudo mkdir -p "$INSTALL_DIR"

# Copy files to the install directory (adjust as necessary)
sudo cp -r ./* "$INSTALL_DIR/" || { echo "Failed to copy files. Exiting."; exit 1; }

echo "Setting file permissions and ownership..."

# Ensure chrome-sandbox exists before changing ownership and permissions
cd "$INSTALL_DIR"
if [ -f "chrome-sandbox" ]; then
    chown root:root chrome-sandbox
    sync
    chmod 4755 chrome-sandbox
    sync
else
    echo "chrome-sandbox not found. Skipping..."
fi

# Step 2: Create the .desktop file for Desktop and system-wide

echo "Creating .desktop file..."

# Create .desktop file for the user's Desktop
cat > "$DESKTOP_DIR/$DESKTOP_FILE_NAME" <<EOL
[Desktop Entry]
Version=1.0
Name=$APP_NAME
Comment=Launch $APP_NAME
Exec=$INSTALL_DIR/electron
Icon=$ICON_PATH
Terminal=false
Type=Application
Categories=Utility;
EOL

# Make the .desktop file executable
chmod +x "$DESKTOP_DIR/$DESKTOP_FILE_NAME"

# Create .desktop file for system-wide use (in /usr/share/applications)
sudo cat > "/usr/share/applications/$DESKTOP_FILE_NAME" <<EOL
[Desktop Entry]
Version=1.0
Name=$APP_NAME
Comment=Launch $APP_NAME
Exec=$INSTALL_DIR/electron
Icon=$ICON_PATH
Terminal=false
Type=Application
Categories=Utility;
EOL

# Make the system-wide .desktop file executable
sudo chmod +x "/usr/share/applications/$DESKTOP_FILE_NAME"

echo "Installation complete."`;

const install_windows_cmd = ({ short_cut_name }) => `@echo off
:: Désactive l'affichage des erreurs
setlocal enabledelayedexpansion

:: Remplace les espaces par des underscores pour éviter les problèmes de chemin
set "APP_NAME=${short_cut_name.replaceAll(" ", "-")}"

:: Définition des variables
set "INSTALL_DIR=C:\Program Files\%APP_NAME%"
set "DESKTOP_PATH=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_PATH%\%APP_NAME%.url"
set "EXE_PATH=%INSTALL_DIR%\electron.exe"
set "ICON_PATH=%INSTALL_DIR%\resources\icon.ico"
set "START_MENU_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\%APP_NAME%.url"

:: Créer le dossier d'installation
echo Installing files to "%INSTALL_DIR%"...
mkdir "%INSTALL_DIR%" 2>nul

xcopy "%~dp0" "%INSTALL_DIR%" /E /I /H /Y

:: Donner les permissions nécessaires
echo Granting permissions...
icacls "%INSTALL_DIR%" /grant "%USERNAME%":F /T /C /Q >nul

:: Créer un raccourci sur le bureau (URL format)
echo Creating desktop shortcut...
(
echo [InternetShortcut]
echo URL=file:///%EXE_PATH%
echo IconFile=%ICON_PATH%
echo IconIndex=0
) > "%SHORTCUT_PATH%"

:: Créer un raccourci dans le menu Démarrer (URL format)
echo Creating Start Menu shortcut...
(
echo [InternetShortcut]
echo URL=file:///%EXE_PATH%
echo IconFile=%ICON_PATH%
echo IconIndex=0
) > "%START_MENU_PATH%"

echo Installation complete.
pause
`;

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

// --- Begin Dependency Cleanup ---

// Define the path to the node_modules in the packaged app
const nodeModulesApp = path.join(resourcesPath, "app", "node_modules");

// Remove the Electron package (it isn’t needed after packaging)
const electronPathToRemove = path.join(nodeModulesApp, "electron");
if (fs.existsSync(electronPathToRemove)) {
  fs.rmSync(electronPathToRemove, { recursive: true, force: true });
  console.log("🚮 Removed Electron from node_modules in the packaged app.");
}

// === Step 1: Prune unused dependencies using npm ===
// This uses the production flag to remove anything not listed in "dependencies".
console.log("Pruning unused dependencies in packaged app...");
try {
  execSync("npm prune --production", {
    cwd: path.join(resourcesPath, "app"),
    stdio: "inherit",
  });
} catch (err) {
  console.error("Error pruning unused dependencies:", err.message);
}

// === Step 2: Recursively remove devDependencies and their transitive dependencies ===

// Read package.json once to get both production and dev dependencies.
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json"), { encoding: "utf-8" })
);
const devDeps = packageJson.devDependencies
  ? Object.keys(packageJson.devDependencies)
  : [];
const prodDeps = packageJson.dependencies
  ? Object.keys(packageJson.dependencies)
  : [];

// Treat production dependencies as shared dependencies that must NOT be removed.
const sharedDependencies = prodDeps;

// Recursive function to remove a dependency and its transitive dependencies,
// skipping any that are shared.
function removeDependencyAndDeps(dependencyName) {
  // Skip if dependency is shared (i.e. a production dependency)
  if (sharedDependencies.includes(dependencyName)) {
    console.log(`Skipping shared dependency: ${dependencyName}`);
    return;
  }

  const dependencyPath = path.join(nodeModulesApp, dependencyName);
  if (fs.existsSync(dependencyPath)) {
    console.log(`Removing package: ${dependencyName}`);
    fs.rmSync(dependencyPath, { recursive: true, force: true });
    console.log(`**package: ${dependencyName} removed!`);

    // Attempt to fetch the dependency tree for this package and remove its sub-dependencies.
    try {
      const dependencyTreeRaw = execSync(`npm ls ${dependencyName} --json`, {
        cwd: nodeModulesApp,
        stdio: ["pipe", "pipe", "ignore"],
      }).toString();
      const dependencyTree = JSON.parse(dependencyTreeRaw);
      if (dependencyTree.dependencies) {
        Object.keys(dependencyTree.dependencies).forEach((subDep) => {
          removeDependencyAndDeps(subDep);
        });
      }
    } catch (err) {
      // It's normal to see an error if the package is already removed; we simply log it.
      console.error(
        `⚠️ Error fetching dependencies for ${dependencyName}: ${err.message}`
      );
    }
  }
}

// Remove each devDependency (and their transitive dependencies) from node_modules.
devDeps.forEach((dep) => {
  removeDependencyAndDeps(dep);
});
fs.readdirSync(path.join(output, "resources", "app", "node_modules")).forEach(
  (e) => {
    try {
      if (
        fs.readdirSync(path.join(output, "resources", "app", "node_modules", e))
          .length > 0
      )
        return;

      fs.rmSync(path.join(output, "resources", "app", "node_modules", e));
    } catch (e) {}
  }
);

// --- End Dependency Cleanup ---

// Create installer script for Linux or Windows based on OS
if (os.platform() === "linux") {
  fs.writeFileSync(
    path.join(output, "install.sh"),
    install_linux_bash({
      short_cut_name: JSON.parse(
        fs.readFileSync(path.join(__dirname, "package.json"), {
          encoding: "utf-8",
        })
      ).productName,
    })
  );
}
if (os.platform() === "win32") {
  fs.writeFileSync(
    path.join(output, "install.bat"),
    install_windows_cmd({
      short_cut_name: JSON.parse(
        fs.readFileSync(path.join(__dirname, "package.json"), {
          encoding: "utf-8",
        })
      ).productName,
    })
  );
}
console.log("✅ Packaging complete!");
