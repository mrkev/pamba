import("stdfaust.lib");
declare name "Track Utility";
declare version "0.1";
declare author "Kevin Chavez";
declare description "Standard track controls for Dinidaw";

// -----------------------------
// UI Controls
// -----------------------------

gain = vslider("Gain [unit:dB][style:knob]", 0, -60, 12, 0.1) : ba.db2linear;
pan  = vslider("Pan [-1=Left, 1=Right][style:knob]", 0, -1, 1, 0.01);
mute = checkbox("Mute");

// -----------------------------
// Utility
// -----------------------------

// Stereo balance: at center both channels pass through untouched (keeping the
// stereo image); panning one way fades the opposite channel out on a
// constant-power curve. (Mono sources arrive as identical L/R, so they pan too.)
balL = cos(max(pan, 0) * ma.PI / 2);
balR = cos(max(0 - pan, 0) * ma.PI / 2);

// Mute control
muteGain = 1 - mute;

// -----------------------------
// Processing
// -----------------------------

process = hgroup("track", _, _
  : applyGain
  : applyPan);

applyGain(l, r) = (l * gain * muteGain, r * gain * muteGain);

applyPan(l, r) = (l * balL, r * balR);
