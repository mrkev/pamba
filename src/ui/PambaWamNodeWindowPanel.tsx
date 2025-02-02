import { useState } from "react";
import ReactDOM from "react-dom";
import { usePrimitive } from "structured-state";
import { useLinkedState } from "../lib/state/LinkedState";
import { nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { WamPluginContent } from "../wam/WamPluginContent";
import { WindowPanel } from "./WindowPanel";
import { UtilityToggle } from "./UtilityToggle";

function printInfo(descriptor: any) {
  let result = JSON.stringify(
    descriptor,
    (key, value) => {
      const skip = new Set(["thumbnail", "keywords"]);
      if (typeof value === "boolean" || skip.has(key)) {
        return;
      } else {
        return value;
      }
    },
    2,
  );

  result = result.substring(1, result.length - 1);
  return (
    <div>
      {result.split("\n").map((x, i) => (
        <p key={i}>
          {x
            .split(":")
            .map((x) => x.trim().substring(1).replaceAll('",', "").replaceAll('"', ""))
            .join(": ")}
        </p>
      ))}
    </div>
  );
}

export function PambaWamNodeWindowPanel({ effect, onClose }: { effect: PambaWamNode; onClose: () => void }) {
  const [position, setPosition] = useLinkedState(effect.windowPanelPosition);
  const [showInfo, setShowInfo] = useState(false);
  const [name] = usePrimitive(effect.name);

  return ReactDOM.createPortal(
    <WindowPanel
      onClose={onClose}
      title={
        <span>
          {name}{" "}
          <UtilityToggle
            title={"show info"}
            toggled={showInfo}
            onToggle={setShowInfo}
            style={{ display: "inline" }}
            toggleStyle={{ backgroundColor: "orange" }}
          >
            <i className="ri-information-line" onClick={() => setShowInfo((prev) => !prev)}></i>
          </UtilityToggle>
        </span>
      }
      position={position}
      onPositionChange={setPosition}
    >
      <WamPluginContent wam={effect} />
      {showInfo && (
        <div
          style={{
            position: "absolute",
            background: "rgba(0,0,0,0.9)",
            top: 0,
            left: 0,
            zIndex: 10,
            width: "100%",
            height: "100%",
            fontFamily: "monospace",
            overflow: "scroll",
          }}
        >
          {printInfo((effect.wamInstance as any)["_descriptor"])}
        </div>
      )}
    </WindowPanel>,
    nullthrows(document.querySelector("#wam-window-panels")),
  );
}
