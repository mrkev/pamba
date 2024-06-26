import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { utility } from "./utility";

export function UtilityButton({ className, style, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={classNames(utility.button, className)} style={style} {...props} />;
}

export function UtilityTextInput({
  className,
  style,
  onChange,
  disabled,
  value,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onChange?: (value: string) => void;
}) {
  const [edit, setEdit] = useState(value);
  const [editable] = useState(!disabled && onChange != null);
  const [skipBlurChange, setSkipBlurChange] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setEdit(value), [value]);

  return (
    <input
      ref={ref}
      type="text"
      className={classNames("utilityInput", className)}
      style={style}
      {...props}
      value={edit}
      disabled={disabled || !editable}
      onChange={(e) => setEdit(e.target.value)}
      onBlur={() => {
        if (!editable || skipBlurChange) {
          setSkipBlurChange(false);
          return;
        }
        onChange?.(edit);
      }}
      onKeyDown={(e) => {
        switch (e.key) {
          case "Enter": {
            onChange?.(edit);
            setSkipBlurChange(true);
            // otherwise onblur triggers before state chagne
            setTimeout(() => {
              ref.current?.blur();
            }, 0);
            break;
          }
          case "Escape": {
            setEdit(value);
            setSkipBlurChange(true);
            setTimeout(() => {
              ref.current?.blur();
            }, 0);
            break;
          }
        }
      }}
    />
  );
}
