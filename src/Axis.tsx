import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { axisTop } from "d3-axis";
import { scaleLinear } from "d3-scale";
import { AudioProject } from "./lib/AudioProject";
import { useDerivedState } from "./lib/DerivedState";

import { ValueFn } from "d3-selection";

export function Axis({
  project,
  projectDiv,
}: {
  project: AudioProject;
  projectDiv: HTMLDivElement;
}) {
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const secsToPx = useDerivedState(project.secsToPx);
  const ticksRef = useRef<Array<number>>([]);

  useEffect(
    function () {
      if (!svg) {
        return;
      }
      const d3svg = d3.select(svg).attr("width", 1440).attr("height", 30);

      // const group = d3svg.append("g")
      // .selectAll("line").data(ticks);

      // console.log(ticks);
      // group
      //   .enter()
      //   .append("line")
      //   .attr("x1", ({ t }) => t)
      //   .attr("y1", 0)
      //   .attr("x2", ({ t }) => t)
      //   .attr("y2", 100)
      //   .attr("stroke", "black");
    },
    [svg]
  );

  useEffect(() => {
    if (!svg) {
      return;
    }

    const pxToSecs = secsToPx.invert;

    const ticks = [];
    const totalTime = pxToSecs(projectDiv.scrollWidth);
    for (let i = 0; i < totalTime; i += 10) {
      // console.log(projectDiv.scrollWidth);
      ticks.push({ i, t: secsToPx(i) });
    }

    // How wide the axis will be
    const width = 100;

    const scale = scaleLinear()
      .domain([0, width])
      .range([0, secsToPx(width)]);

    const axis = axisTop(scale).ticks(3);
    const d3svg = d3.select(svg); //.attr("width", 1440).attr("height", 30);

    const axisGroup = d3svg
      .append("g")
      .attr("transform", "translate(0,30)")
      .call(axis);

    const group = d3svg.append("g").selectAll("line").data(ticks);

    console.log(ticks);
    group
      .enter()
      .append("line")
      .attr("x1", ({ t }) => t)
      .attr("y1", 0)
      .attr("x2", ({ t }) => t)
      .attr("y2", 100)
      .attr("stroke", "black");

    group.exit().remove();

    group.data(ticks);
    return () => {
      axisGroup.remove();
    };
  }, [projectDiv, secsToPx, svg]);

  return <svg ref={(elem: SVGSVGElement) => setSvg(elem)}></svg>;
}
