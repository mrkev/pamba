import classNames from "classnames";
import { createUseStyles } from "react-jss";

export type DraggableData = string;

type ListItem<T> = {
  title: string;
  disabled?: boolean;
  data?: T;
};

export function UtilityList<T>({
  items,
  onItemClick,
  draggable,
}: {
  items: ListItem<T>[];
  onItemClick?: (item: ListItem<T>) => void;
  draggable?: boolean;
}) {
  const classes = useStyles();

  const onDragEnd = draggable ? () => {} : undefined;
  const onDragStart = draggable
    ? function (ev: React.DragEvent<HTMLDivElement>) {
        // ev.dataTransfer.setData("text/uri-list", url);
        // ev.dataTransfer.setData("text/plain", url);
        // pressedState.set({
        //   status: "dragging_new_audio",
        //   clientX: ev.clientX,
        //   clientY: ev.clientY,
        // });
      }
    : undefined;

  return (
    <div className={classes.list}>
      {items.map(function (item, i) {
        const disabled = Boolean(item.disabled);
        return (
          <div
            tabIndex={0}
            className={classNames(classes.listItem, disabled && classes.listItemDisabled)}
            key={i}
            draggable={draggable && !disabled}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              if (disabled) {
                return;
              }

              if (e.target instanceof HTMLDivElement) {
                e.target.focus();
              }
            }}
            onDoubleClick={() => {
              // ignorePromise(loadClip(url));
            }}
          >
            {item.title}
          </div>
        );
      })}
    </div>
  );
}

const useStyles = createUseStyles({
  list: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid #999",
    borderRadius: "3px",
    flexGrow: 1,
  },
  listItem: {
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    padding: "0px 2px",
    "&:focus": {
      outline: "5px auto -webkit-focus-ring-color",
      background: "white",
    },
  },
  listItemDisabled: {
    color: "gray",
  },
});
