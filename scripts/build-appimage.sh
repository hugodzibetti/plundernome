#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

APP=Plundernome
VERSION=${1:-0.1.0}
ARCH=x86_64
BUILD_DIR=build/AppImage

echo "Building $APP v$VERSION AppImage..."

node scripts/build.mjs

mkdir -p "$BUILD_DIR/$APP.AppDir/usr/bin"
mkdir -p "$BUILD_DIR/$APP.AppDir/usr/share/applications"
mkdir -p "$BUILD_DIR/$APP.AppDir/usr/share/icons/hicolor/scalable/apps"
mkdir -p "$BUILD_DIR/$APP.AppDir/usr/share/metainfo"

cp dist/main.js "$BUILD_DIR/$APP.AppDir/usr/bin/plundernome"
cp src/ui/style.css "$BUILD_DIR/$APP.AppDir/usr/share/plundernome/style.css"
cp flatpak/io.github.plundernome.desktop "$BUILD_DIR/$APP.AppDir/usr/share/applications/"
cp flatpak/icons/io.github.plundernome.svg "$BUILD_DIR/$APP.AppDir/usr/share/icons/hicolor/scalable/apps/"
cp flatpak/io.github.plundernome.metainfo.xml "$BUILD_DIR/$APP.AppDir/usr/share/metainfo/"

cat > "$BUILD_DIR/$APP.AppDir/AppRun" << 'RUNEOF'
#!/usr/bin/env bash
export GSETTINGS_SCHEMA_DIR="${APP_DIR}/usr/share/glib-2.0/schemas"
exec gjs "${APP_DIR}/usr/bin/plundernome" "$@"
RUNEOF
chmod +x "$BUILD_DIR/$APP.AppDir/AppRun"

if ! command -v appimagetool &>/dev/null; then
  echo "Downloading appimagetool..."
  wget -q "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-${ARCH}.AppImage" -O /tmp/appimagetool
  chmod +x /tmp/appimagetool
  /tmp/appimagetool "$BUILD_DIR/$APP.AppDir" "$BUILD_DIR/$APP-${VERSION}-${ARCH}.AppImage"
else
  appimagetool "$BUILD_DIR/$APP.AppDir" "$BUILD_DIR/$APP-${VERSION}-${ARCH}.AppImage"
fi

echo "AppImage: $BUILD_DIR/$APP-${VERSION}-${ARCH}.AppImage"
