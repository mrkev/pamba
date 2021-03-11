import { loadSound } from "./loadSound";

export const x = {};

// Global Variables for Audio
export let audioContext: AudioContext;
let audioBuffer;
let sourceNode;
let analyserNode;
let javascriptNode;
let audioData = null;
let audioPlaying = false;
let sampleSize = 1024; // number of samples to collect before analyzing data
let amplitudeArray; // array to hold time domain data
// This must be hosted on the same server as this page - otherwise you get a Cross Site Scripting error
let audioUrl = "viper.mp3";
// Global variables for the Graphics
let canvasWidth = 512;
let canvasHeight = 256;
let ctx;
