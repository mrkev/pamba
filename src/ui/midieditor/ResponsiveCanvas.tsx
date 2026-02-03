import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { useDrawOnCanvas } from "../useDrawOnCanvas";

interface Dimensions {
  width: number;
  height: number;
}

export function ResponsiveCanvas({
  color = "blue",
  label = "Canvas",
  drawFn,
  className,
  style,
  canvasStyle,
}: {
  color?: string;
  label?: string;
  drawFn?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
  className?: string;
  style?: React.CSSProperties;
  canvasStyle?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  const resizeCanvas = (): void => {
    const container = containerRef.current;
    if (container) {
      const { clientWidth, clientHeight } = container;
      setDimensions((prev) => {
        if (prev.width !== clientWidth || prev.height !== clientHeight) {
          return { width: clientWidth, height: clientHeight };
        }
        return prev;
      });
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const dpr: number = window.devicePixelRatio || 1;

    // resize if dimensions have changed
    // if (canvas.width !== dimensions.width * dpr && canvas.height !== dimensions.height * dpr) {
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;

    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    // }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (drawFn != null) {
      drawFn(ctx, canvas);
    } else {
      drawDimensions(canvas, ctx, color, label);
    }
  }, [dimensions, color, label, drawFn]);

  return (
    <div
      className={cn("w-full h-full max-h-full max-w-full box-border overflow-hidden", className)}
      ref={containerRef}
      style={style}
    >
      <canvas ref={canvasRef} style={canvasStyle} />
    </div>
  );
}

function drawDimensions(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, color = "blue", label = "Canvas") {
  const dpr: number = window.devicePixelRatio || 1;

  const dimensions = {
    width: canvas.width / dpr,
    height: canvas.height / dpr,
  };

  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, dimensions.width, dimensions.height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, dimensions.width / 2, dimensions.height / 2 - 15);
  ctx.font = "14px Arial";
  ctx.fillText(`DPR: ${dpr.toFixed(2)}`, dimensions.width / 2, dimensions.height / 2 + 10);
  ctx.fillText(`${dimensions.width} × ${dimensions.height}px`, dimensions.width / 2, dimensions.height / 2 + 30);
}

export function ResponsiveCanvasTest() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "10px",
        padding: "10px",
        boxSizing: "border-box",
        backgroundColor: "#f0f0f0",
      }}
    >
      <ResponsiveCanvas color="#3b82f6" label="Canvas 1" />
      <ResponsiveCanvas color="#ef4444" label="Canvas 2" />
      <ResponsiveCanvas color="#10b981" label="Canvas 3" />
      <ResponsiveCanvas color="#f59e0b" label="Canvas 4" />
    </div>
  );
}
