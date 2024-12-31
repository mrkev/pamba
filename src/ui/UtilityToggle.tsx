import classNames from "classnames";
import { utility } from "./utility";

// "var(--control-subtle-highlight)"
export function UtilityToggle({
  className,
  style: styleArg,
  toggleStyle = { backgroundColor: "orange" },
  toggled,
  onToggle,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onToggle"> & {
  toggleStyle?: React.CSSProperties;
  toggled: boolean;
  onToggle: (toggled: boolean) => void;
  title: string | null;
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
