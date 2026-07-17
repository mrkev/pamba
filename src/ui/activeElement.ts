import { MarkedValue, useLinkAsState } from "marked-subbable";
import { useEffect } from "react";

const activeElement = MarkedValue.create<Element | null>(null);

export function useActiveElement() {
  const [activeElem] = useLinkAsState(activeElement);

  useEffect(() => {
    // Set the initial focused element on mount
    activeElement.set(document.activeElement);

    const handleFocusIn = () => {
      activeElement.set(document.activeElement);
    };

    const handleFocusOut = () => {
      activeElement.set(document.activeElement);
    };

    // Listen globally for focus changes
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return activeElem;
}
