import { css } from "@linaria/core";

export const utility = {
  button: css`
    font-size: 10px;
    font-weight: bold;
    padding: 1px 6px;
    height: 16px;
    border: none;
    background: #d3d3d3;
    cursor: pointer;
    margin-left: 2px;
    // border: 1px solid black;
  `,
  slider: css`
    appearance: none;
    background: #d3d3d3;

    &::-webkit-slider-thumb {
      width: 1px;
      appearance: none;
      height: 16px;
      cursor: ew-resize;
      background: black;
    }
  `,
} as const;
