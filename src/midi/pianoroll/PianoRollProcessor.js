/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/Clip.ts":
/*!*********************!*\
  !*** ./src/Clip.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "PPQN": () => (/* binding */ PPQN),
/* harmony export */   "PP16": () => (/* binding */ PP16),
/* harmony export */   "Clip": () => (/* binding */ Clip)
/* harmony export */ });
/* harmony import */ var _shared_util__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../shared/util */ "../shared/util.ts");

const PPQN = 24;
const PP16 = (PPQN / 4);
class Clip {
    constructor(id, state) {
        if (state) {
            this.state = {
                id: id || state.id,
                length: state.length,
                notes: state.notes.map(n => {
                    return { ...n };
                })
            };
        }
        else {
            this.state = {
                id: id || (0,_shared_util__WEBPACK_IMPORTED_MODULE_0__.token)(),
                length: 16 * PP16,
                notes: []
            };
        }
        this.dirty = true;
        this.quantize = PP16;
    }
    getState(removeId) {
        let state = {
            length: this.state.length,
            notes: this.state.notes.map(n => {
                return { ...n };
            })
        };
        if (!removeId) {
            state.id = this.state.id;
        }
        return state;
    }
    async setState(state, newId) {
        if (!state.id && !newId) {
            console.error("Need an id for clip!");
            return;
        }
        this.state.id = newId ? newId : state.id;
        this.state.length = state.length;
        this.state.notes = state.notes.map(n => {
            return { ...n };
        });
        this.dirty = true;
        if (this.updateProcessor)
            this.updateProcessor(this);
    }
    hasNote(tick, number) {
        return this.state.notes.some((n) => n.tick == tick && n.number == number);
    }
    addNote(tick, number, duration, velocity) {
        this.dirty = true;
        if (this.hasNote(tick, number)) {
            return;
        }
        for (var insertIndex = 0; insertIndex < this.state.notes.length && this.state.notes[insertIndex].tick < tick; insertIndex++)
            ;
        this.state.notes = this.state.notes.slice(0, insertIndex).concat([{ tick, number, duration, velocity }].concat(this.state.notes.slice(insertIndex, this.state.notes.length)));
        if (this.updateProcessor)
            this.updateProcessor(this);
    }
    removeNote(tick, number) {
        this.dirty = true;
        this.state.notes = this.state.notes.filter((n) => n.tick != tick || n.number != number);
        if (this.updateProcessor)
            this.updateProcessor(this);
    }
    notesForTick(tick) {
        return this.state.notes.filter((n) => n.tick == tick);
    }
    notesInTickRange(startTick, endTick, note) {
        return this.state.notes.filter((n) => {
            return n.number == note && n.tick + n.duration > startTick && n.tick < endTick;
        });
    }
    setRenderFlag(dirty) {
        this.dirty = dirty;
    }
    needsRender() {
        return this.dirty;
    }
}


/***/ }),

/***/ "../shared/midi.ts":
/*!*************************!*\
  !*** ../shared/midi.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "MIDI": () => (/* binding */ MIDI)
/* harmony export */ });
class MIDI {
}
MIDI.NOTE_ON = 0x90;
MIDI.NOTE_OFF = 0x80;
MIDI.CC = 0xB0;


/***/ }),

/***/ "../shared/util.ts":
/*!*************************!*\
  !*** ../shared/util.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "token": () => (/* binding */ token),
/* harmony export */   "constantSource": () => (/* binding */ constantSource),
/* harmony export */   "noiseSource": () => (/* binding */ noiseSource)
/* harmony export */ });
function token() {
    return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 16);
}
function constantSource(audioContext) {
    if (audioContext.createConstantSource) {
        let source = audioContext.createConstantSource();
        source.start();
        return source;
    }
    else {
        let length = audioContext.sampleRate;
        var buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
        var noise = buffer.getChannelData(0);
        for (var i = 0; i < length; i++) {
            noise[i] = 1.0;
        }
        var source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = 0.0;
        source.loopEnd = 0.9;
        source.start();
        return source;
    }
}
function noiseSource(audioContext) {
    let length = audioContext.sampleRate;
    var buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    var noise = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) {
        noise[i] = (Math.random() * 2) - 1;
    }
    var source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0.0;
    source.loopEnd = 0.9;
    source.start();
    return source;
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!***********************************!*\
  !*** ./src/PianoRollProcessor.ts ***!
  \***********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _shared_midi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../shared/midi */ "../shared/midi.ts");
/* harmony import */ var _Clip__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Clip */ "./src/Clip.ts");


const moduleId = 'Tom BurnsPiano Roll';
const PPQN = 24;
const audioWorkletGlobalScope = globalThis;
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
const WamProcessor = ModuleScope.WamProcessor;
class PianoRollProcessor extends WamProcessor {
    constructor(options) {
        super(options);
        const { moduleId, instanceId, } = options.processorOptions;
        this.lastTime = null;
        this.ticks = -1;
        this.clips = new Map();
        this.currentClipId = "default";
        this.count = 0;
        super.port.start();
    }
    _generateWamParameterInfo() {
        return {};
    }
    _process(startSample, endSample, inputs, outputs) {
        const { currentTime } = audioWorkletGlobalScope;
        if (this.pendingClipChange && this.pendingClipChange.timestamp <= currentTime) {
            this.currentClipId = this.pendingClipChange.id;
            this.pendingClipChange = undefined;
        }
        let clip = this.clips.get(this.currentClipId);
        if (!clip) {
            return;
        }
        if (!this.transportData) {
            return;
        }
        var schedulerTime = currentTime + 0.05;
        if (this.transportData.playing && this.transportData.currentBarStarted <= schedulerTime) {
            var timeElapsed = schedulerTime - this.transportData.currentBarStarted;
            var beatPosition = (this.transportData.currentBar * this.transportData.timeSigNumerator) + ((this.transportData.tempo / 60.0) * timeElapsed);
            var tickPosition = Math.floor(beatPosition * PPQN);
            let clipPosition = tickPosition % clip.state.length;
            if (this.ticks != clipPosition) {
                let secondsPerTick = 1.0 / ((this.transportData.tempo / 60.0) * PPQN);
                this.ticks = clipPosition;
                clip.notesForTick(clipPosition).forEach(note => {
                    this.emitEvents({ type: 'wam-midi', time: schedulerTime, data: { bytes: [_shared_midi__WEBPACK_IMPORTED_MODULE_0__.MIDI.NOTE_ON, note.number, note.velocity] } }, { type: 'wam-midi', time: schedulerTime + (note.duration * secondsPerTick) - 0.001, data: { bytes: [_shared_midi__WEBPACK_IMPORTED_MODULE_0__.MIDI.NOTE_OFF, note.number, note.velocity] } });
                });
            }
        }
        return;
    }
    async _onMessage(message) {
        if (message.data && message.data.action == "clip") {
            let clip = new _Clip__WEBPACK_IMPORTED_MODULE_1__.Clip(message.data.id, message.data.state);
            this.clips.set(message.data.id, clip);
        }
        else if (message.data && message.data.action == "play") {
            this.pendingClipChange = {
                id: message.data.id,
                timestamp: 0,
            };
        }
        else {
            super._onMessage(message);
        }
    }
    _onTransport(transportData) {
        this.transportData = transportData;
        super.port.postMessage({
            event: "transport",
            transport: transportData
        });
    }
}
try {
    audioWorkletGlobalScope.registerProcessor(moduleId, PianoRollProcessor);
}
catch (error) {
    console.warn(error);
}

})();

/******/ })()
;