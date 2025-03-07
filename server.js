import express from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import wav from 'wav';
import vosk from 'vosk';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

// Optional: reduce Vosk log verbosity
vosk.setLogLevel(0);

const app = express();
const port = process.env.PORT || 3333;

// Constants
const MODEL_PATH = './model/vosk-model-ja-0.22'; // Path to your Vosk model folder
// const MODEL_PATH = './model/vosk-model-small-ja-0.22'; // Path to your Vosk model folder
const SAMPLE_RATE = 16000; // Expected sample rate for the WAV file

// Global instances for services
let voskModel;
let kuroshiroInstance;

/**
 * Convert a WebM file from a URL to a WAV file.
 * @param {string} inputUrl - The direct URL to the WebM file.
 * @param {string} outputPath - Path for the output WAV file.
 * @returns {Promise}
 */
function convertWebmUrlToWav(inputUrl, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputUrl)
      .outputOptions([
        '-ar 16000', // Set sample rate to 16kHz
        '-ac 1',     // Convert to mono channel
        '-f wav'     // Set output format to WAV
      ])
      .on('end', () => {
        console.log('Conversion to WAV completed.');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error during conversion:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Transcribe a WAV file using Vosk.
 * @param {string} filePath - Path to the WAV file.
 * @returns {Promise<Object>} - Resolves with the transcription result.
 */
function transcribeWav(filePath) {
  return new Promise((resolve, reject) => {
    const wfReader = new wav.Reader();

    wfReader.on('format', (format) => {
      // Validate audio format: must be 16-bit PCM at SAMPLE_RATE
      if (format.audioFormat !== 1 || format.sampleRate !== SAMPLE_RATE) {
        return reject(new Error(`Invalid format. Expected 16kHz 16-bit PCM but got ${format.sampleRate}Hz, format ${format.audioFormat}.`));
      }
      // Create a recognizer instance using the global Vosk model
      const recognizer = new vosk.Recognizer({ model: voskModel, sampleRate: SAMPLE_RATE });
      
      wfReader.on('data', (data) => {
        recognizer.acceptWaveform(data);
      });
      
      wfReader.on('end', () => {
        const result = recognizer.finalResult();
        recognizer.free();
        resolve(result);
      });
    });

    fs.createReadStream(filePath).pipe(wfReader);
  });
}

/**
 * Process the audio by converting the file, transcribing it, and converting Kanji to Hiragana.
 * @param {string} fileUrl - URL of the WebM file from Google Drive.
 * @returns {Promise<Object>} - Resolves with an object containing the transcription result and Hiragana text.
 */
async function processAudio(fileUrl) {
  // Generate a unique temporary file path for the WAV file
  const tempWavFile = path.join(os.tmpdir(), `${randomUUID()}.wav`);
  try {
    console.log('Starting conversion...');
    await convertWebmUrlToWav(fileUrl, tempWavFile);

    console.log('Starting transcription...');
    const transcriptionResult = await transcribeWav(tempWavFile);
    console.log('Vosk Transcription Result:', transcriptionResult);
    
    // Assume the transcription result contains a property "text" with the recognized Kanji text.
    const kanjiText = transcriptionResult.text;
    if (kanjiText && kanjiText.trim().length > 0) {
      // Convert Kanji text to Hiragana using the global Kuroshiro instance.
      const hiraganaText = await kuroshiroInstance.convert(kanjiText, { to: "hiragana" });
      console.log('Converted Hiragana:', hiraganaText);
      return { transcription: transcriptionResult, kana: hiraganaText };
    } else {
      console.log('No transcription text available to convert.');
      return { transcription: transcriptionResult, kana: null };
    }
  } finally {
    // Clean up the temporary WAV file
    fs.unlink(tempWavFile, (err) => {
      if (err) {
        console.error(`Error deleting temporary file ${tempWavFile}:`, err);
      } else {
        console.log(`Temporary file ${tempWavFile} deleted.`);
      }
    });
  }
}

// Define an endpoint that accepts a Google Drive file id as a query parameter.
app.get('/transcribe', async (req, res) => {
  const fileId = req.query.fileId;
  if (!fileId) {
    return res.status(400).json({ error: "Missing 'fileId' query parameter." });
  }
  // Build the public file URL from the provided file id.
  const publicFileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  try {
    const result = await processAudio(publicFileUrl);
    res.json(result);
  } catch (error) {
    console.error('Error in /transcribe:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Initialize global services (Vosk model and Kuroshiro analyzer) before starting the server.
 */
async function initializeServices() {
  // Ensure the Vosk model folder exists
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error("Model folder not found. Download a model from https://alphacephei.com/vosk/models and unzip it into your project directory as 'model'.");
  }
  // Load the Vosk model once and reuse it
  voskModel = new vosk.Model(MODEL_PATH);
  console.log('Vosk model loaded.');

  // Initialize Kuroshiro with the Kuromoji analyzer once for all requests
  kuroshiroInstance = new Kuroshiro();
  await kuroshiroInstance.init(new KuromojiAnalyzer());
  console.log('Kuroshiro initialized.');
}

// Start the service once global initialization is complete.
initializeServices().then(() => {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Express server is running on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to initialize services:', err);
  process.exit(1);
});
