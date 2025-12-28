import { useLink } from "marked-subbable";
import { appEnvironment } from "../lib/AppEnvironment";
import { MidiInstrument } from "../midi/MidiInstrument";
import { PambaWamNode } from "../wam/PambaWamNode";
import { PambaWamNodeWindowPanel } from "./PambaWamNodeWindowPanel";

export function EffectWindows() {
  const openEffects = useLink(appEnvironment.openEffects);
  return [...openEffects().values()].map((effect, i) => {
    if (effect instanceof PambaWamNode) {
      return <PambaWamNodeWindowPanel key={i} effect={effect} onClose={() => openEffects().delete(effect)} />;
    }
    if (effect instanceof MidiInstrument) {
      return <PambaWamNodeWindowPanel key={i} effect={effect.pambaWam} onClose={() => openEffects().delete(effect)} />;
    }

    return null;
  });
}
