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
}: {
  activeTab: string | null;
  onSelectTab: SetState<string | null>;
  panels: Record<string, Panel>;
}) {
  const styles = useStyles();
  const activePanel = activeTab != null ? panels[activeTab] : null;
  const isCollapsed = activePanel == null;

  return (
    <div
      className={classNames(styles.panel, isCollapsed && styles.panelCollapsed, !isCollapsed && styles.panelExpanded)}
    >
      <div className={classNames(styles.tabs, isCollapsed && styles.collapsedTabs)}>
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
      </div>
      {activePanel?.render()}
    </div>
  );
}

const useStyles = createUseStyles({
  tabs: {
    display: "flex",
    flexDirection: "row",
    gap: 4,
    borderBottom: "2px solid var(--control-bg-color)",
  },
  collapsedTabs: {
    flexDirection: "column",
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
  panelCollapsed: {
    width: "22px",
  },
  panelExpanded: {
    maxWidth: "220px",
    minWidth: "220px",
  },
});
