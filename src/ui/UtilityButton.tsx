import classNames from "classnames";
import { useEffect, useState } from "react";
import { ignoreMaybePromise } from "../utils/ignorePromise";
import { utility } from "./utility";

export function UtilityButton({ className, style, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={classNames(utility.button, className)} style={style} {...props} />;
}

type MaybePromise<T> = Promise<T> | T;

export function UtilityTextInput({
  className,
  style,
  onChange,
  disabled,
  value,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => MaybePromise<string | void>;
}) {
  const [edit, setEdit] = useState(value);
  const [editable, setEditable] = useState(!disabled);
  useEffect(() => setEdit(value), [value]);

  return (
    <input
      type="text"
      className={classNames("utilityInput", className)}
      style={style}
      {...props}
      value={edit}
      disabled={disabled || !editable}
      onChange={(e) => setEdit(e.target.value)}
      onBlur={() => {
        if (!editable) {
          return;
        }
        ignoreMaybePromise(onChange(edit));
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") {
          return;
        }

        const maybePromise = onChange(value);
        if (maybePromise instanceof Promise) {
          setEditable(false);
          maybePromise
            .then((value) => {
              if (typeof value === "string") {
                setEdit(value);
              }
              setEditable(!disabled);
            })
            .catch((e) => {
              console.error(e);
              setEditable(!disabled);
            });
        } else if (typeof value === "string") {
          setEdit(value);
        } else {
          return;
        }
      }}
    />
  );
}
