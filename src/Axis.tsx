import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import { axisTop } from "d3-axis";
import { scaleLinear } from "d3-scale";
import { useLinkedState } from "./lib/LinkedState";
import { AudioProject } from "./lib/AudioProject";

export function Axis({ project }: { project: AudioProject }) {
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const [secsToPx] = useLinkedState(project.secsToPx);

  useEffect(() => {
    if (!svg) {
      return;
    }

    // How wide the axis will be
    const width = 100;

    const scale = scaleLinear()
      .domain([0, width])
      .range([0, secsToPx(width)]);

    const axis = axisTop(scale).ticks(3);
    const d3svg = d3.select(svg).attr("width", 1440).attr("height", 30);

    const group = d3svg
      .append("g")
      .attr("transform", "translate(0,30)")
      .call(axis);

    return () => {
      group.remove();
    };
  }, [secsToPx, svg]);

  return <svg ref={(elem: SVGSVGElement) => setSvg(elem)}></svg>;
}
