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

// Constant-power panning
panL = sqrt((1 - pan) / 2);
panR = sqrt((1 + pan) / 2);

// Mute control
muteGain = 1 - mute;

// -----------------------------
// Processing
// -----------------------------

process = hgroup("foo", _, _
  : applyGain
  : applyPan);

applyGain(l, r) = (l * gain * muteGain, r * gain * muteGain);

applyPan(l, r) = (
  l * panL + r * panL,
  l * panR + r * panR
);
