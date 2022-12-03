import React, { useRef } from "react";

export function UploadButton({
  value,
  hidden,
  className,
  style,
  ...props
}: Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref" | "type">) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input type="file" ref={inputRef} {...props} hidden />
      <button
        className={className}
        style={style}
        onClick={() => {
          console.log("HI");
          inputRef.current?.click();
        }}
        hidden={hidden}
      >
        {value}
      </button>
    </>
  );
}

export function AnchorButton({
  hidden,
  children,
  className,
  style,
  ...props
}: Omit<React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>, "ref">) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
      <a ref={anchorRef} {...props} hidden />
      <button
        className={className}
        style={style}
        onClick={() => {
          anchorRef.current?.click();
        }}
        hidden={hidden}
      >
        {children}
      </button>
    </>
  );
}
