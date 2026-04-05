import classNames from "classnames";
import React from "react";
import { createUseStyles } from "react-jss";
import { SetState } from "../utils/types";

type Panel = {
  icon: React.ReactElement;
  title: string;
  render: () => React.ReactElement;
};

export function UtilityTabbedPanel<P extends Record<string, Panel>>({
  activeTab,
  onSelectTab,
  panels,
  dividerPosition,
  expandedSize = "220px",
  style,
  controlsStart,
  controlsEnd,
  className,
  onMouseDownCapture,
  activeButtonClassName,
}: {
  activeTab: keyof P | null;
  onSelectTab: SetState<keyof P | null>;
  panels: P;
  dividerPosition: "right" | "left" | "top" | "bottom";
  expandedSize?: string;
  style?: React.CSSProperties;
  controlsStart?: React.ReactNode;
  controlsEnd?: React.ReactNode;
  className?: string;
  onMouseDownCapture?: React.MouseEventHandler<HTMLDivElement>;
  activeButtonClassName?: string;
}) {
  const styles = useStyles();
  const activePanel = activeTab != null ? panels[activeTab] : null;
  const isCollapsed = activePanel == null;

  const layout: "horizontal" | "vertical" =
    dividerPosition === "left" || dividerPosition === "right" ? "horizontal" : "vertical";

  return (
    <div
      onMouseDownCapture={onMouseDownCapture}
      className={classNames(
        "flex flex-col grow items-stretch",
        styles.panel,
        layout === "vertical" && styles.panelVertical,
        isCollapsed && layout === "horizontal" && styles.panelCollapsedHorizontal,
        isCollapsed && layout === "vertical" && styles.panelCollapsedVertical,
        !isCollapsed && styles.panelExpanded,
        className,
      )}
      style={
        !isCollapsed
          ? layout === "horizontal"
            ? {
                maxWidth: expandedSize,
                minWidth: expandedSize,
                ...style,
              }
            : {
                maxHeight: expandedSize,
                minHeight: expandedSize,
                ...style,
              }
          : style
      }
    >
      <div
        className={classNames(
          styles.tabs,
          "flex flex-row flex-wrap",
          isCollapsed && layout === "horizontal" && "flex-col flex-nowrap",
          isCollapsed && layout === "vertical" && "flex-row flex-nowrap",
          dividerPosition === "top" && "self-stretch",
        )}
        style={
          layout === "horizontal"
            ? {
                padding: "4px 0px 4px 0px",
                borderBottom: "2px solid var(--control-bg-color)",
              }
            : {
                // borderRight: "2px solid var(--control-bg-color)",
                // alignSelf: "flex-start",
                padding: "0px 4px 0px 0px",
              }
        }
      >
        {controlsStart}
        {Object.entries(panels).map(([id, panel]) => {
          return (
            <button
              title={panel.title}
              key={id}
              className={classNames(
                "utilityButton",
                "overflow-hidden whitespace-nowrap text-ellipsis",
                activeTab === id && "utilityButtonActive",
                activeTab === id && activeButtonClassName,
              )}
              onClick={() => {
                if (activeTab === id) {
                  onSelectTab(null);
                } else {
                  onSelectTab(id);
                }
              }}
            >
              {panel.icon}
              {!isCollapsed && panel.title}
            </button>
          );
        })}
        <div className="spacer"></div>
        {controlsEnd}
      </div>
      {layout === "horizontal"
        ? activePanel?.render()
        : activePanel && (
            <div
              className={classNames(styles.vertical, "flex flex-row grow items-stretch")}
              style={{
                flexShrink: 1,
                minHeight: 0,
                paddingBottom: 4,
              }}
            >
              {activePanel.render()}
            </div>
          )}
    </div>
  );
}

const useStyles = createUseStyles({
  tabs: { gap: 4 },
  panel: {
    // border: "1px solid black",
    gap: 4,
    padding: "0px 4px 0px 4px",
    // paddingBottom: "128px",
  },
  panelVertical: {
    // paddingTop: "4px",
  },
  panelCollapsedHorizontal: {
    width: "22px",
  },
  panelCollapsedVertical: {
    height: "24px",
  },
  panelExpanded: {},
  horizontal: {},
  vertical: {},
  bottomPanelTabs: {
    // paddingTop: "4px",
    alignSelf: "stretch",
    // alignItems: "center",
  },
});
