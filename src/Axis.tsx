import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { axisTop } from "d3-axis";
import { scaleLinear } from "d3-scale";
import { AudioProject } from "./lib/AudioProject";
import { useDerivedState } from "./lib/DerivedState";
import { useLinkedState } from "./lib/LinkedState";

const formatter = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  minimumIntegerDigits: 2,
});

function formatSecs(secs: number) {
  return `${formatter.format(Math.floor(secs / 60))}:${formatter.format(
    secs % 60
  )}`;
}

const MIN_TICK_DISTANCE = 60; // 60px

function getStepForRes(dist: number): number {
  switch (true) {
    case dist < 1:
      return 1;
    case dist < 3:
      return 3;
    case dist < 5:
      return 5;
    case dist < 10:
      return 10;
    case dist < 30:
      return 30;
    default:
      return 60;
  }
}

export function Axis({
  project,
  projectDiv,
}: {
  project: AudioProject;
  projectDiv: HTMLDivElement;
}) {
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const secsToPx = useDerivedState(project.secsToPx);
  // const [tracks] = useLinkedState(project.allTracks);

  useEffect(() => {
    if (!svg) {
      return;
    }

    const d3svg = d3.select(svg);

    // DRAW HORIZONTAL AXIS
    // ie, timestamp ticks

    const pxToSecs = secsToPx.invert;
    const tickData: Array<{ s: number; px: number }> = [];
    // TODO: draw only visible window, not whole timeline
    const totalTime = pxToSecs(projectDiv.scrollWidth);

    const MIN_DIST_SEC = pxToSecs(MIN_TICK_DISTANCE);
    const STEP = getStepForRes(MIN_DIST_SEC);

    for (let i = 0; i < totalTime; i += STEP) {
      tickData.push({ s: i, px: secsToPx(i) });
    }

    // // How wide the axis will be
    // const width = 100;
    // const scale = scaleLinear()
    //   .domain([0, width])
    //   .range([0, secsToPx(width)]);
    // const axis = axisTop(scale).ticks(3);
    // const axisGroup = d3svg
    //   .append("g")
    //   .attr("transform", "translate(0,30)")
    //   .call(axis);

    const ticks = d3svg.selectAll("g.tick").data(tickData);

    const groupEnter = ticks.enter().append("g").attr("class", "tick");

    groupEnter
      .append("line")
      .attr("x1", ({ px }) => px)
      .attr("x2", ({ px }) => px)
      .attr("y1", 0)
      .attr("y2", "100%")
      .attr("stroke", "#CBCBCB");

    groupEnter
      .append("text")
      .attr("x", ({ px }) => px)
      .attr("y", 2)
      .attr("dx", "2px")
      .attr("font-size", "12px")
      .attr("fill", "#454545")
      .text(({ s: i }) => formatSecs(i))
      .attr("text-anchor", "start")
      .attr("alignment-baseline", "hanging");

    ticks
      .select("line")
      .attr("x1", ({ px }) => px)
      .attr("x2", ({ px }) => px);

    ticks
      .select("text")
      .attr("x", ({ px }) => px)
      .text(({ s: i }) => formatSecs(i));

    ticks.exit().remove();

    // // DRAW VERTICAL AXIS
    // // ie, track borders

    // const trackData: Array<{ i: number }> = [];
    // // TODO: draw only visible window, not whole timeline
    // const maxHeight = pxToSecs(projectDiv.scrollHeight);

    // for (let i = 0; i < tracks.length; i++) {
    //   trackData.push({ i });
    // }

    // const trackLines = d3svg.selectAll("line.track").data(trackData);
    // trackLines
    //   .enter()
    //   .append("line")
    //   .attr("class", "track")
    //   .attr("x1", 0)
    //   .attr("x2", "100%")
    //   .attr("y1", ({ i }) => i * 10)
    //   .attr("y2", ({ i }) => i * 10)
    //   .attr("stroke", "#CBCBCB");

    // trackLines.exit().remove();
  }, [projectDiv, secsToPx, svg]);

  return (
    <>
      {/* Background grid */}
      <svg
        ref={(elem: SVGSVGElement) => setSvg(elem)}
        style={{
          position: "absolute",
          width: 1440,
          height: "100%",
          pointerEvents: "none",
        }}
      ></svg>
      {/* Spacer to make the project content not overlap with the timestamps */}
      <div
        className="axis-spacer"
        style={{ height: 30, display: "block", pointerEvents: "none" }}
      ></div>
    </>
  );
}

/**
 * TODO:
 * - Scale is currently anchored on 0:00. Anchor it on the cursor position
 * - Scale with trackpad, anchored on cursor position
 * - Click and drag on axis moves, zooms, like ableton
 * - If a control is focused, need to click twice to set cursor. Fix that.
 * - Clip properties panel.
 * - Format seconds on canvas view
 * - Disable clip addition during playback, or adding a clip stops playback first.
 * - Markers, play from marker
 * - Comments on markers, for collaboration?
 * - Loop markers, enable/disable loop capturing
 * - Select within single track
 * - Keyboard shortcuts: cut, paste, copy
 * - Command palette, a-la VS Code. Cmd+P
 * - BUG: trimming a clip draws the whole waveform, not a subset
 */
