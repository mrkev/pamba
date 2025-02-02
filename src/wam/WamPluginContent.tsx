import React, { useEffect, useRef } from "react";
import { MidiInstrument } from "../midi/MidiInstrument";
import { PambaWamNode } from "./PambaWamNode";

export const WamPluginContent = React.memo(function WamPluginContentImpl({
  wam,
}: {
  wam: PambaWamNode | MidiInstrument;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const div = divRef.current;
    div?.appendChild(wam.dom);
    return () => {
      div?.removeChild(wam.dom);
    };
  }, [wam, wam.dom]);
  return <div ref={divRef} />;
});
