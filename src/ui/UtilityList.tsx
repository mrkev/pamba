import classNames from "classnames";
import { useMemo } from "react";
import { createUseStyles } from "react-jss";

export type DraggableData = string;

export type ListItem<T> = {
  title: string;
  disabled?: boolean;
  disableDrag?: boolean;
  data: T;
  icon?: React.ReactElement;
  secondary?: React.ReactNode;
};

export type ListSeparator = "separator";

export type ListEntry<T> = ListItem<T> | ListSeparator;

export function UtilityDataList<T>({
  items,
  filter,
  onItemFocus,
  onItemSelect,
  draggable,
  onDragStart: dragStart,
  onDragEnd: dragEnd,
  onKeydown,
  disabled: listDisabled,
}: {
  items: ListEntry<T>[];
  onItemFocus?: (item: ListItem<T>) => void;
  onItemSelect?: (item: ListItem<T>) => void;
  onDragStart?: (item: ListItem<T>, e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (item: ListItem<T>, e: React.DragEvent<HTMLDivElement>) => void;
  onKeydown?: (item: ListItem<T>, e: React.KeyboardEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  disabled?: boolean;
  filter?: string;
}) {
  const classes = useStyles();

  const filtered = useMemo(() => {
    return filter == null || filter === ""
      ? items
      : items.filter((item) => {
          if (item === "separator") {
            return false;
          }
          return item.title.toLowerCase().includes(filter.toLowerCase());
        });
  }, [filter, items]);

  return (
    <div
      className={classNames(
        "flex flex-col grow shrink overflow-y-scroll text-control-text-color bg-utility-list-bg",
        classes.list,
        listDisabled && "pointer-events-none bg-utility-list-bg-disabled",
      )}
      aria-disabled={listDisabled}
    >
      {filtered.map(function (item, i) {
        if (item === "separator") {
          return <hr key={i} style={{ margin: "2px 4px 0px 4px" }} />;
        }

        const disabled = Boolean(listDisabled) || Boolean(item.disabled);
        const disableDrag = Boolean(item.disableDrag);

        return (
          <div
            title={item.title}
            tabIndex={0}
            className={classNames(
              "text-ellipsis whitespace-nowrap shrink-0",
              classes.listItem,
              disabled && "text-list-item-disabled",
              item.icon && "flex flex-row items-center",
              item.icon && classes.listItemWithIcon,
            )}
            key={i}
            draggable={!disableDrag && draggable && !disabled}
            onDragStart={(e) => {
              if (disableDrag || !draggable || disabled) {
                return;
              }
              dragStart?.(item, e);
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "ArrowUp" && e.target instanceof HTMLDivElement) {
                firstDivSibbling(e.target.previousElementSibling, "prev")?.focus();
                e.preventDefault();
                return;
              }

              if (e.key === "ArrowDown" && e.target instanceof HTMLDivElement) {
                firstDivSibbling(e.target.nextElementSibling, "next")?.focus();
                e.preventDefault();
                return;
              }

              if (e.key === "Enter") {
                // For some reason, the Enter keypress here seems to be "still in effect"
                // while onItemSelect executes. More specifically, if I show a doConfirm dialog in
                // onItemSelect it auto-selects the enter option. This doesn't happen if I chante
                // this clause to another key, say ArrowLeft or ArrowRight.
                // So we just put it in a new task. *shrug*.
                setTimeout(() => onItemSelect?.(item), 0);
                return;
              }

              onKeydown?.(item, e);
            }}
            onDragEnd={(e) => {
              dragEnd?.(item, e);
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              if (disabled) {
                return;
              }

              if (e.target instanceof HTMLDivElement) {
                e.target.focus();
              }

              onItemFocus?.(item);
            }}
            onDoubleClick={() => {
              if (disabled) {
                return;
              }
              onItemSelect?.(item);
            }}
          >
            {item.icon}
            <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.title}</span>
            {/* <input
              type="text"
              style={{ fontSize: "inherit", fontWeight: "inherit", border: "none", padding: 0, margin: 0 }}
            ></input> */}
            <div style={{ flexGrow: 1 }} />
            {item.secondary}
          </div>
        );
      })}
    </div>
  );
}

const useStyles = createUseStyles({
  list: {
    border: "1px solid #999",
    borderRadius: "3px",
    padding: "2px 0px",
  },
  listItem: {
    padding: "0px 2px",
    "&:focus": {
      outline: "5px auto -webkit-focus-ring-color",
      background: "white",
    },
  },
  listItemWithIcon: {
    gap: 2,
  },
});

function firstDivSibbling(elem: Element | null, dir: "prev" | "next"): HTMLDivElement | null {
  let res: Element | null = elem;
  while (res) {
    if (res instanceof HTMLDivElement) {
      return res;
    }
    if (res == null) {
      return null;
    }
    res = dir === "prev" ? res.previousElementSibling : res.nextElementSibling;
  }
  return null;
}
