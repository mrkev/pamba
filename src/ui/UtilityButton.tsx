import classNames from "classnames";
import { utility } from "./utility";

export function UtilityButton({ className, style, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={classNames(utility.button, className)} style={style} {...props} />;
}
