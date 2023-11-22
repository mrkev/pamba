import classNames from "classnames";
import { utility } from "./utility";

export function UtilityToggle({
  className,
  style: styleArg,
  toggleStyle = { backgroundColor: "var(--control-subtle-highlight)" },
  toggled,
  onToggle: onToggle,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  toggleStyle?: React.CSSProperties;
  toggled: boolean;
  onToggle: (toggled: boolean) => void;
}) {
  const style = toggled ? { ...styleArg, ...toggleStyle } : styleArg;
  return (
    <button
      className={classNames(utility.button, className)}
      style={style}
      {...props}
      onClick={function (e) {
        onToggle(!toggled);
        e.stopPropagation();
      }}
    />
  );
}
