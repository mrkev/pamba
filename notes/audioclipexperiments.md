```typescript
  // const canvasOffset = relu(viewportStartPx - project.viewport.pxOfTime(timelineStart));
  // const cWidth = width - relu(left + width - projectDivWidth) + viewportStartPx - canvasOffset;
  // const canvasWidth = Math.ceil(Math.min(cWidth, width - canvasOffset));
  // const offset =
  //   project.viewport.pxToSecs(canvasOffset) * clip.sampleRate + bufferOffset.ensureSecs() * clip.sampleRate;
/**
 * As a child of <StandardClip />
  {/* {clip.buffer != null && canvasWidth > 0 && (
        <GPUWaveform
          color="#122411"
          renderer={clip.buffer.renderer}
          scale={(1 / scale) * clip.sampleRate}
          offset={offset}
          width={canvasWidth}
          height={height}
          style={{
            // border: "2px solid red",
            pointerEvents: "none",
            userSelect: "none",
            position: "relative",
            left: canvasOffset - 1, // -1 due to clip border
            boxSizing: "border-box",
            height: height,
            width: canvasWidth,
            flexGrow: 1,
            imageRendering: "pixelated",
          }}
        ></GPUWaveform>
      )} */}


function GPUWaveform({
  scale,
  renderer,
  offset = 0,
  color = "#00FF00",
  style,
  ...props
}: React.CanvasHTMLAttributes<HTMLCanvasElement> & {
  scale: number;
  offset?: number;
  color?: string;
  renderer: GPUWaveformRenderer;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = nullthrows(nullthrows(canvasRef.current).getContext("webgpu"), "nil webgpu context");
    renderer.render(context, scale, offset, color);
    // renderer.render(context, s, offset, width, height, color);
  }, [color, offset, renderer, scale, style?.width]);

  return <canvas ref={canvasRef} style={style} {...props} />;
}


// TODO: use this for DSP effects automation, but treat track gain as a "special"
// gain that's automatable with fade-in, fade-out faders only? Ie, if I end up
// showing it in the DSP chain, instead of showing the track header as a "utility"
// effect with gain, mute, etc. show it as a "header utility" with "track gain",
// mute, etc? That or generalize the special fade-in UI to any automation,
// except the cool thing about the UI is you can't go past max=1
function _ClipAutomation({ clip, secsToPx }: { clip: AudioClip; secsToPx: XScale }) {
  const MAX_GAIN = 2;
  const MIN_GAIN = 0;

  const valToPcnt = (val: number) => {
    const scale = scaleLinear().domain([MIN_GAIN, MAX_GAIN]).range([0, 100]) as XScale;

    return `${scale(val)}%`;
  };

  return (
    <svg>
      {clip.gainAutomation.map(({ time, value }, i) => {
        const [x1, y1] = [secsToPx(time), valToPcnt(value)];
        const { time: time2, value: value2 } = clip.gainAutomation[i + 1] || {
          time: 0, // TODO
          value,
        };
        const [x2, y2] = [secsToPx(time2), valToPcnt(value2)];

        return (
          <React.Fragment key={`point-line-${i}`}>
            <circle style={{ fill: "red", stroke: "red" }} cx={x1} cy={y1} r={4}></circle>
            <line x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: "red", strokeWidth: "2px" }} />
          </React.Fragment>
        );
      })}
    </svg>
  );
}
```
