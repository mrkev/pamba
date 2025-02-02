import React, { useEffect, useRef } from "react";
import { PambaWamNode } from "./PambaWamNode";

// used in window panels
export const WamPluginContent = React.memo(function WamPluginContentImpl({ wam }: { wam: PambaWamNode }) {
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
