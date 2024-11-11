// taken from the Online WAM Gallery (https://mainline.i3s.unice.fr/wamGallery/public/), at https://www.webaudiomodules.com/community/plugins.json
import plugins from "./plugins.json";

export type PambaWAMPluginDescriptor = {
  // in json
  identifier: string;
  name: string;
  vendor: string;
  website: string;
  description: string;
  // custom
  url: string;
  kind: "-m" | "-a" | "m-a" | "a-a"; // midi out, audio out, midi to audio, audio to audio
};

export const KINDS_SORT = { "-m": 0, "-a": 1, "m-a": 2, "a-a": 3 };

const INCLUDE = new Set([
  // "com.sequencerParty.audioInput",
  "com.sequencerParty.simpleDistortion",
  // "com.sequencerParty.envmod",
  // "com.sequencerParty.functionSeq",
  // "com.sequencerParty.microkorg",
  // "com.sequencerParty.jx3p",
  // "com.sequencerParty.ob6",
  // "com.sequencerParty.midiOut",
  // "com.sequencerParty.randomizer",
  "com.sequencerParty.soundfont",
  // "com.sequencerParty.butterChurn",
  // "com.sequencerParty.audioTrack",
  "com.sequencerParty.drumComputer",
  // "com.sequencerParty.midiDebug",
  "com.sequencerParty.modal",
  "com.sequencerParty.microverb",
  // "com.sequencerParty.stepmod",
  "com.sequencerParty.simpleDelay",
  // "com.sequencerParty.MIDIIn",
  // "com.sequencerParty.pianoRoll",
  "com.sequencerParty.simpleEQ",
  "com.sequencerParty.synth101",
  // "com.sequencerParty.isfVideo",
  // "com.sequencerParty.videoInput",
  // "com.sequencerParty.threejs",

  // WIMICS
  "com.wimmics.bigmuff",
  // "com.wimmics.blipper", // knobs don't work
  "com.wimmics.csoundpitchshifter",
  // "com.wimmics.deathgate", // knobs don't work
  // "com.wimmics.distomachine", // knobs don't work
  "com.wimmics.dualpitchshifter",
  "com.wimmics.graphicequalizer",
  // "com.wimmics.greyhole", // knobs don't work
  // "com.wimmics.guitarampsim60s", // knobs don't work
  // "com.wimmics.kbverb", // knobs don't work
  // "com.wimmics.kppfuzz", // knobs don't work
  "com.wimmics.kppdistorder",
  "com.wimmics.livegain",
  "com.wimmics.oscilloscope",
  "com.wimmics.spectrogram",
  "com.wimmics.spectroscope",
  // "com.wimmics.osctube", // knobs don't work
  // "com.wimmics.overdriverix", // knobs don't work
  // "com.wimmics.owldirty", // knobs don't work
  "com.wimmics.owlshimmer",
  // "com.wimmics.reactpedalboard", // not very good
  // "com.wimmics.pedalboardwac2022", // doesn't exist
  "com.wimmics.pingpongdelay",
  "com.wimmics.quadrafuzz",
  "com.wimmics.smoothdelay",
  "com.wimmics.stereofreqshifter",
  "com.wimmics.stonephaser",
  "com.wimmics.sweetwah",
  "com.wimmics.temper",
  "com.wimmics.thruzeroflanger",
  "com.wimmics.ts9overdrive",
  "com.wimmics.weirdphaser",
  "com.wimmics.stereoenhancer",

  // CMajor
  "dev.cmajor.examples.pro54",
  "dev.cmajor.TX81Z",
]);

export const WAMPLUGINS: PambaWAMPluginDescriptor[] = plugins
  .filter((plugin) => INCLUDE.has(plugin.identifier))
  .map((plugin): PambaWAMPluginDescriptor => {
    return {
      identifier: plugin.identifier,
      name: plugin.name,
      vendor: plugin.vendor,
      website: plugin.website,
      description: plugin.description,
      // TODO? better?
      kind: plugin.category.includes("Instrument") || plugin.category.includes("Synthesizer") ? "m-a" : "a-a",
      url: "https://www.webaudiomodules.com/community/plugins/" + plugin.path,
    };
  })
  .concat([
    {
      identifier: "dev.cmajor.examples.pro54",
      name: "Pro54",
      vendor: "Cmajor",
      website: "",
      description: "A faithful Cmajor port of the classic Native Instruments Pro-53 synth",
      kind: "m-a",
      url: "https://wam-4tt.pages.dev/Pro54/index.js",
    },
    {
      identifier: "dev.cmajor.TX81Z",
      name: "TX81Z",
      vendor: "Cmajor Software Ltd",
      description: "TX81Z",
      website: "",
      kind: "m-a",
      url: "https://wam-4tt.pages.dev/TX81Z/index.js",
    },
  ]);
