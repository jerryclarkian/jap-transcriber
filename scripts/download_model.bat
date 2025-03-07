@echo off
set "MODEL_URL=https://alphacephei.com/vosk/models/vosk-model-ja-0.22.zip"
set "ZIP_FILE=vosk-model-ja-0.22.zip"
set "TARGET_DIR=.\model"

REM Download the model archive using PowerShell
powershell -Command "Invoke-WebRequest -Uri '%MODEL_URL%' -OutFile '%ZIP_FILE%'"

REM Create the target directory if it doesn't exist
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

REM Extract the zip file using PowerShell's Expand-Archive
powershell -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%TARGET_DIR%' -Force"

REM Delete the downloaded zip file
del "%ZIP_FILE%"

echo Model downloaded and extracted to %TARGET_DIR%
pause
