#!/bin/bash
# URL of the model archive
MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-small-ja-0.22.zip"
# MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-ja-0.22.zip"
ZIP_FILE="vosk-model-ja-0.22.zip"
TARGET_DIR="./model"

# Download the model archive (uses wget or curl)
if command -v wget > /dev/null; then
  wget "$MODEL_URL" -O "$ZIP_FILE"
elif command -v curl > /dev/null; then
  curl -L "$MODEL_URL" -o "$ZIP_FILE"
else
  echo "Error: Neither wget nor curl is installed."
  exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Extract the zip file into the target directory (requires unzip)
if command -v unzip > /dev/null; then
  unzip -q "$ZIP_FILE" -d "$TARGET_DIR"
else
  echo "Error: unzip command not found. Please install unzip."
  exit 1
fi

# Remove the downloaded zip file
rm "$ZIP_FILE"

echo "Model downloaded and extracted to $TARGET_DIR"
