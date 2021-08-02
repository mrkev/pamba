import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { axisTop } from "d3-axis";
import { scaleLinear } from "d3-scale";
import { AudioProject } from "./lib/AudioProject";
import { useDerivedState } from "./lib/DerivedState";

const formatter = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  minimumIntegerDigits: 2,
});

function formatSecs(secs: number) {
  return `${formatter.format(Math.floor(secs / 60))}:${formatter.format(
    secs % 60
  )}`;
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

  useEffect(() => {
    if (!svg) {
      return;
    }

    const pxToSecs = secsToPx.invert;
    const tickData: Array<{ i: number; t: number }> = [];
    // TODO: draw only visible window, not whole timeline
    const totalTime = pxToSecs(projectDiv.scrollWidth);

    for (let i = 0; i < totalTime; i += 10) {
      // console.log(projectDiv.scrollWidth);
      tickData.push({ i, t: secsToPx(i) });
    }

    const d3svg = d3.select(svg).attr("width", 1440).attr("height", 30);

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
      .attr("x1", ({ t }) => t)
      .attr("x2", ({ t }) => t)
      .attr("y1", 0)
      .attr("y2", 100)
      .attr("stroke", "black");

    groupEnter
      .append("text")
      .attr("x", ({ t }) => t)
      .attr("y", 2)
      .attr("dx", "2px")
      .attr("font-size", "12px")
      .text(({ i }) => formatSecs(i))
      .attr("text-anchor", "start")
      .attr("alignment-baseline", "hanging");

    ticks
      .select("line")
      .attr("x1", ({ t }) => t)
      .attr("x2", ({ t }) => t);

    ticks.select("text").attr("x", ({ t }) => t);

    ticks.exit().remove();
    // d3svg.selectAll("line").data(ticks).exit().remove();

    // lines.data(ticks);
    return () => {
      // axisGroup.remove();
    };
  }, [projectDiv, secsToPx, svg]);

  return <svg ref={(elem: SVGSVGElement) => setSvg(elem)}></svg>;
}
