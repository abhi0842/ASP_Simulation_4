export function createTimeCursorPlugin(cursorIndexRef, setCursorIndex, dataLen) {
  return {
    id: "timeCursor",
    afterInit(chart) {
      chart.canvas.style.cursor = "crosshair";
    },
    afterEvent(chart, args) {
      const e = args.event;
      if (!e || dataLen < 1) return;
      const xScale = chart.scales.x;
      if (!xScale) return;

      const isClick = e.type === "click";
      const isDrag = e.type === "mousemove" && e.native?.buttons === 1;
      if (isClick || isDrag) {
        const x = xScale.getValueForPixel(e.x);
        const ds = chart.data.datasets[0]?.data;
        if (!ds?.length) return;
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < ds.length; i++) {
          const d = Math.abs((ds[i].x ?? i) - x);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        if (best !== cursorIndexRef.current) {
          cursorIndexRef.current = best;
          setCursorIndex(best);
          chart.update("none");
        }
      }
    },
    afterDraw(chart) {
      const idx = cursorIndexRef.current;
      const ds = chart.data.datasets[0]?.data;
      if (!ds?.length || idx < 0 || idx >= ds.length) return;
      const x = ds[idx].x ?? idx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) return;
      const px = xScale.getPixelForValue(x);
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = "#7F77DD";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, yScale.top);
      ctx.lineTo(px, yScale.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };
}
