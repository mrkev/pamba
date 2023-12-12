import classNames from "classnames";
import React from "react";
import { createUseStyles } from "react-jss";
import { SetState } from "../utils/types";

type Panel = {
  icon: React.ReactElement;
  title: string;
  render: () => React.ReactElement;
};
export function UtilityTabbedPanel({
  activeTab,
  onSelectTab,
  panels,
  dividerPosition,
  expandedSize = 220,
  style,
  extraControls,
}: {
  activeTab: string | null;
  onSelectTab: SetState<string | null>;
  panels: Record<string, Panel>;
  dividerPosition: "right" | "left" | "top" | "bottom";
  expandedSize?: number;
  style?: React.CSSProperties;
  extraControls?: React.ReactNode;
}) {
  const styles = useStyles();
  const activePanel = activeTab != null ? panels[activeTab] : null;
  const isCollapsed = activePanel == null;

  const layout: "horizontal" | "vertical" =
    dividerPosition === "left" || dividerPosition === "right" ? "horizontal" : "vertical";

  return (
    <div
      className={classNames(
        styles.panel,
        layout === "vertical" && styles.panelVertical,
        isCollapsed && layout === "horizontal" && styles.panelCollapsedHorizontal,
        isCollapsed && layout === "vertical" && styles.panelCollapsedVertical,
        !isCollapsed && styles.panelExpanded,
      )}
      style={
        !isCollapsed
          ? layout === "horizontal"
            ? {
                maxWidth: `${expandedSize}px`,
                minWidth: `${expandedSize}px`,
                ...style,
              }
            : {
                maxHeight: `${expandedSize}px`,
                minHeight: `${expandedSize}px`,
                ...style,
              }
          : style
      }
    >
      <div
        className={classNames(
          styles.tabs,
          isCollapsed && layout === "horizontal" && styles.collapsedTabsVertical,
          isCollapsed && layout === "vertical" && styles.collapsedTabsHorizontal,
          dividerPosition === "top" && styles.bottomPanelTabs,
        )}
        style={
          layout === "horizontal"
            ? {
                padding: "0px 0px 4px 0px",
                borderBottom: "2px solid var(--control-bg-color)",
              }
            : {
                // borderRight: "2px solid var(--control-bg-color)",
                // alignSelf: "flex-start",
                padding: "0px 4px 0px 0px",
              }
        }
      >
        {Object.entries(panels).map(([id, panel]) => {
          return (
            <button
              title={panel.title}
              key={id}
              style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
              className={classNames("utilityButton", activeTab === id && "utilityButtonActive")}
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
        {extraControls}
      </div>
      {layout === "horizontal" ? (
        activePanel?.render()
      ) : (
        <div className={styles.vertical} style={{ flexShrink: 1, minHeight: 0, paddingBottom: 4 }}>
          {activePanel?.render()}
        </div>
      )}
    </div>
  );
}

const useStyles = createUseStyles({
  tabs: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  collapsedTabsVertical: {
    flexDirection: "column",
    flexWrap: "nowrap",
  },
  collapsedTabsHorizontal: {
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    // border: "1px solid black",
    flexGrow: 1,
    gap: 4,
    padding: "0px 4px 0px 4px",
    alignItems: "stretch",
    // paddingBottom: "128px",
  },
  panelVertical: {
    paddingTop: "4px",
  },
  panelCollapsedHorizontal: {
    width: "22px",
  },
  panelCollapsedVertical: {
    height: "16px",
  },
  panelExpanded: {
    // maxWidth: "220px",
    // minWidth: "220px",
  },
  horizontal: {
    // flexDirection: "column",
  },
  vertical: {
    flexDirection: "row",
    display: "flex",
    flexGrow: 1,
  },
  bottomPanelTabs: {
    paddingTop: "4px",
    alignSelf: "stretch",
    // alignItems: "center",
  },
});
