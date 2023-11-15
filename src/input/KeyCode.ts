// from: https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
export type KeyCode =
  /*kVK_ANSI_A (0x00)	"KeyA"	*/
  | "KeyA"
  /*kVK_ANSI_S (0x01)	"KeyS"	*/
  | "KeyS"
  /*kVK_ANSI_D (0x02)	"KeyD"	*/
  | "KeyD"
  /*kVK_ANSI_F (0x03)	"KeyF"	*/
  | "KeyF"
  /*kVK_ANSI_H (0x04)	"KeyH"	*/
  | "KeyH"
  /*kVK_ANSI_G (0x05)	"KeyG"	*/
  | "KeyG"
  /*kVK_ANSI_Z (0x06)	"KeyZ"	*/
  | "KeyZ"
  /*kVK_ANSI_X (0x07)	"KeyX"	*/
  | "KeyX"
  /*kVK_ANSI_C (0x08)	"KeyC"	*/
  | "KeyC"
  /*kVK_ANSI_V (0x09)	"KeyV"	*/
  | "KeyV"
  /*kVK_ISO_Section (0x0A)	"IntlBackslash"	*/
  | "IntlBackslash"
  /*kVK_ANSI_B (0x0B)	"KeyB"	*/
  | "KeyB"
  /*kVK_ANSI_Q (0x0C)	"KeyQ"	*/
  | "KeyQ"
  /*kVK_ANSI_W (0x0D)	"KeyW"	*/
  | "KeyW"
  /*kVK_ANSI_E (0x0E)	"KeyE"	*/
  | "KeyE"
  /*kVK_ANSI_R (0x0F)	"KeyR"	*/
  | "KeyR"
  /*kVK_ANSI_Y (0x10)	"KeyY"	*/
  | "KeyY"
  /*kVK_ANSI_T (0x11)	"KeyT"	*/
  | "KeyT"
  /*kVK_ANSI_1 (0x12)	"Digit1"	*/
  | "Digit1"
  /*kVK_ANSI_2 (0x13)	"Digit2"	*/
  | "Digit2"
  /*kVK_ANSI_3 (0x14)	"Digit3"	*/
  | "Digit3"
  /*kVK_ANSI_4 (0x15)	"Digit4"	*/
  | "Digit4"
  /*kVK_ANSI_6 (0x16)	"Digit6"	*/
  | "Digit6"
  /*kVK_ANSI_5 (0x17)	"Digit5"	*/
  | "Digit5"
  /*kVK_ANSI_Equal (0x18)	"Equal"	*/
  | "Equal"
  /*kVK_ANSI_9 (0x19)	"Digit9"	*/
  | "Digit9"
  /*kVK_ANSI_7 (0x1A)	"Digit7"	*/
  | "Digit7"
  /*kVK_ANSI_Minus (0x1B)	"Minus"	*/
  | "Minus"
  /*kVK_ANSI_8 (0x1C)	"Digit8"	*/
  | "Digit8"
  /*kVK_ANSI_0 (0x1D)	"Digit0"	*/
  | "Digit0"
  /*kVK_ANSI_RightBracket (0x1E)	"BracketRight"	*/
  | "BracketRight"
  /*kVK_ANSI_O (0x1F)	"KeyO"	*/
  | "KeyO"
  /*kVK_ANSI_U (0x20)	"KeyU"	*/
  | "KeyU"
  /*kVK_ANSI_LeftBracket (0x21)	"BracketLeft"	*/
  | "BracketLeft"
  /*kVK_ANSI_I (0x22)	"KeyI"	*/
  | "KeyI"
  /*kVK_ANSI_P (0x23)	"KeyP"	*/
  | "KeyP"
  /*kVK_Return (0x24)	"Enter"	*/
  | "Enter"
  /*kVK_ANSI_L (0x25)	"KeyL"	*/
  | "KeyL"
  /*kVK_ANSI_J (0x26)	"KeyJ"	*/
  | "KeyJ"
  /*kVK_ANSI_Quote (0x27)	"Quote"	*/
  | "Quote"
  /*kVK_ANSI_K (0x28)	"KeyK"	*/
  | "KeyK"
  /*kVK_ANSI_Semicolon (0x29)	"Semicolon"	*/
  | "Semicolon"
  /*kVK_ANSI_Backslash (0x2A)	"Backslash"	*/
  | "Backslash"
  /*kVK_ANSI_Comma (0x2B)	"Comma"	*/
  | "Comma"
  /*kVK_ANSI_Slash (0x2C)	"Slash"	*/
  | "Slash"
  /*kVK_ANSI_N (0x2D)	"KeyN"	*/
  | "KeyN"
  /*kVK_ANSI_M (0x2E)	"KeyM"	*/
  | "KeyM"
  /*kVK_ANSI_Period (0x2F)	"Period"	*/
  | "Period"
  /*kVK_Tab (0x30)	"Tab"	*/
  | "Tab"
  /*kVK_Space (0x31)	"Space"	*/
  | "Space"
  /*kVK_ANSI_Grave (0x32)	"Backquote"	*/
  | "Backquote"
  /*kVK_Delete (0x33)	"Backspace"	*/
  | "Backspace"
  //Enter key on keypad of PowerBook (0x34)	"NumpadEnter"(⚠️ Same string for 0x4C) (⚠️ Not the same on Chromium)	"" (❌ Missing)
  /*kVK_Escape (0x35)	"Escape"	*/
  | "Escape"
  //right-command key (0x36)	"MetaRight" (was "OSRight" prior to Firefox 118)	"MetaRight" (was "OSRight" prior to Chromium 52)
  //kVK_Command (0x37)	"MetaLeft" (was "OSLeft" prior to Firefox 118)	"MetaLeft" (was "OSLeft" prior to Chromium 52)
  /*kVK_Shift (0x38)	"ShiftLeft"	*/
  | "ShiftLeft"
  /*kVK_CapsLock (0x39)	"CapsLock"	*/
  | "CapsLock"
  /*kVK_Option (0x3A)	"AltLeft"	*/
  | "AltLeft"
  /*kVK_Control (0x3B)	"ControlLeft"	*/
  | "ControlLeft"
  /*kVK_RightShift (0x3C)	"ShiftRight"	*/
  | "ShiftRight"
  /*kVK_RightOption (0x3D)	"AltRight"	*/
  | "AltRight"
  /*kVK_RightControl (0x3E)	"ControlRight"	*/
  | "ControlRight"
  //kVK_Function (0x3F)	"Fn" (⚠️ No events fired actually)	"" (❌ Missing) (⚠️ No events fired actually)
  /*kVK_F17 (0x40)	"F17"	*/
  | "F17"
  /*kVK_ANSI_KeypadDecimal (0x41)	"NumpadDecimal"	*/
  | "NumpadDecimal"
  /*kVK_ANSI_KeypadMultiply (0x43)	"NumpadMultiply"	*/
  | "NumpadMultiply"
  /*kVK_ANSI_KeypadPlus (0x45)	"NumpadAdd"	*/
  | "NumpadAdd"
  /*kVK_ANSI_KeypadClear (0x47)	"NumLock"	*/
  | "NumLock"
  //kVK_VolumeUp (0x48)	"VolumeUp" (⚠️ Not the same on Chromium)	"AudioVolumeUp" (was "VolumeUp" prior to Chromium 1) (⚠️ Not the same on Firefox)
  //kVK_VolumeDown (0x49)	"VolumeDown" (⚠️ Not the same on Chromium)	"AudioVolumeDown" (was "VolumeDown" prior to Chromium 52) (⚠️ Not the same on Firefox)
  //kVK_Mute (0x4A)	"VolumeMute" (⚠️ Not the same on Chromium)	"AudioVolumeMute" (was "VolumeMute" prior to Chromium 52) (⚠️ Not the same on Firefox)
  /*kVK_ANSI_KeypadDivide (0x4B)	"NumpadDivide"	*/
  | "NumpadDivide"
  /*kVK_ANSI_KeypadEnter (0x4C)	"NumpadEnter"	*/
  | "NumpadEnter"
  /*kVK_ANSI_KeypadMinus (0x4E)	"NumpadSubtract"	*/
  | "NumpadSubtract"
  /*kVK_F18 (0x4F)	"F18"	*/
  | "F18"
  /*kVK_F19 (0x50)	"F19"	*/
  | "F19"
  /*kVK_ANSI_KeypadEquals (0x51)	"NumpadEqual"	*/
  | "NumpadEqual"
  /*kVK_ANSI_Keypad0 (0x52)	"Numpad0"	*/
  | "Numpad0"
  /*kVK_ANSI_Keypad1 (0x53)	"Numpad1"	*/
  | "Numpad1"
  /*kVK_ANSI_Keypad2 (0x54)	"Numpad2"	*/
  | "Numpad2"
  /*kVK_ANSI_Keypad3 (0x55)	"Numpad3"	*/
  | "Numpad3"
  /*kVK_ANSI_Keypad4 (0x56)	"Numpad4"	*/
  | "Numpad4"
  /*kVK_ANSI_Keypad5 (0x57)	"Numpad5"	*/
  | "Numpad5"
  /*kVK_ANSI_Keypad6 (0x58)	"Numpad6"	*/
  | "Numpad6"
  /*kVK_ANSI_Keypad7 (0x59)	"Numpad7"	*/
  | "Numpad7"
  /*kVK_F20 (0x5A)	"F20"	*/
  | "F20"
  /*kVK_ANSI_Keypad8 (0x5B)	"Numpad8"	*/
  | "Numpad8"
  /*kVK_ANSI_Keypad9 (0x5C)	"Numpad9"	*/
  | "Numpad9"
  /*kVK_JIS_Yen (0x5D)	"IntlYen"	*/
  | "IntlYen"
  /*kVK_JIS_Underscore (0x5E)	"IntlRo"	*/
  | "IntlRo"
  /*kVK_JIS_KeypadComma (0x5F)	"NumpadComma"	*/
  | "NumpadComma"
  /*kVK_F5 (0x60)	"F5"	*/
  | "F5"
  /*kVK_F6 (0x61)	"F6"	*/
  | "F6"
  /*kVK_F7 (0x62)	"F7"	*/
  | "F7"
  /*kVK_F3 (0x63)	"F3"	*/
  | "F3"
  /*kVK_F8 (0x64)	"F8"	*/
  | "F8"
  /*kVK_F9 (0x65)	"F9"	*/
  | "F9"
  /*kVK_JIS_Eisu (0x66)	"Lang2"	*/
  | "Lang2" // (was "" prior to Chromium 82) (⚠️ No events fired actually)|
  /*kVK_F11 (0x67)	"F11"	*/
  | "F11"
  /*kVK_JIS_Kana (0x68)	"Lang1"	*/
  | "Lang1" // (was "KanaMode" prior to Chromium 82) (⚠️ No events fired actually)|
  /*kVK_F13 (0x69)	"F13"	*/
  | "F13"
  /*kVK_F16 (0x6A)	"F16"	*/
  | "F16"
  /*kVK_F14 (0x6B)	"F14"	*/
  | "F14"
  /*kVK_F10 (0x6D)	"F10"	*/
  | "F10"
  /*context menu key (0x6E)	"ContextMenu"	*/
  | "ContextMenu"
  /*kVK_F12 (0x6F)	"F12"	*/
  | "F12"
  /*kVK_F15 (0x71)	"F15"	*/
  | "F15"
  //kVK_Help (0x72)	"Help" (⚠️ Not the same on Chromium)	"Insert" (⚠️ Not the same on Firefox)
  /*kVK_Home (0x73)	"Home"	*/
  | "Home"
  /*kVK_PageUp (0x74)	"PageUp"	*/
  | "PageUp"
  /*kVK_ForwardDelete (0x75)	"Delete"	*/
  | "Delete"
  /*kVK_F4 (0x76)	"F4"	*/
  | "F4"
  /*kVK_End (0x77)	"End"	*/
  | "End"
  /*kVK_F2 (0x78)	"F2"	*/
  | "F2"
  /*kVK_PageDown (0x79)	"PageDown"	*/
  | "PageDown"
  /*kVK_F1 (0x7A)	"F1"	*/
  | "F1"
  /*kVK_LeftArrow (0x7B)	"ArrowLeft"	*/
  | "ArrowLeft"
  /*kVK_RightArrow (0x7C)	"ArrowRight"	*/
  | "ArrowRight"
  /*kVK_DownArrow (0x7D)	"ArrowDown"	*/
  | "ArrowDown"
  /*kVK_UpArrow (0x7E)	"ArrowUp"	*/
  | "ArrowUp";
