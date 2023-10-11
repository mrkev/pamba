import ReactDOM from "react-dom";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiInstrument } from "../midi/MidiInstrument";
import nullthrows from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { WindowPanel } from "../wam/WindowPanel";
import { WamInstrumentContent, WamPluginContent } from "../wam/wam";

export function PambaWamNodeWindowPanel({
  effect,
  onClose,
}: {
  effect: PambaWamNode | MidiInstrument;
  onClose: () => void;
}) {
  const [position, setPosition] = useLinkedState(effect.windowPanelPosition);
  return ReactDOM.createPortal(
    <WindowPanel onClose={onClose} title={effect.name} position={position} onPositionChange={setPosition}>
      {effect instanceof PambaWamNode ? <WamPluginContent wam={effect} /> : <WamInstrumentContent wam={effect} />}
    </WindowPanel>,
    nullthrows(document.querySelector("#wam-window-panels")),
  );
}
