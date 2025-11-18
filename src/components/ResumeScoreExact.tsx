import React from "react";


export function ResumeScoreExact() {
  const CONTAINER_H = 160; // px
  const H_LINE_Y = 40; 
  const H_LINE_THICK = 2; // px
  const V_TICK_W = 2; // px
  const V_TICK_OVERHANG = 26; 
  const SIDE_INSET = 28; // 

  // Derived values
  const topLineTop = H_LINE_Y;
  const bottomLineTop = CONTAINER_H - H_LINE_Y - H_LINE_THICK;
  const verticalHeight = (bottomLineTop - topLineTop) + H_LINE_THICK + V_TICK_OVERHANG * 2;
  const verticalTop = topLineTop - V_TICK_OVERHANG;

  return (
    <div
      className="w-full relative my-2"
      style={{ height: `${CONTAINER_H}px`, minWidth: 300 }}
    >
     
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${topLineTop}px`,
          height: `${H_LINE_THICK}px`,
          background: "#000",
        }}
      />

     
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${bottomLineTop}px`,
          height: `${H_LINE_THICK}px`,
          background: "#000",
        }}
      />

     
      <div
        style={{
          position: "absolute",
          left: `${SIDE_INSET}px`,
          top: `${verticalTop}px`,
          width: `${V_TICK_W}px`,
          height: `${verticalHeight}px`,
          background: "#000",
        }}
      />

    
      <div
        style={{
          position: "absolute",
          right: `${SIDE_INSET}px`,
          top: `${verticalTop}px`,
          width: `${V_TICK_W}px`,
          height: `${verticalHeight}px`,
          background: "#000",
        }}
      />

     
      <div
        style={{
          position: "absolute",
          left: `${SIDE_INSET - 14}px`,
          top: `${topLineTop - Math.floor(H_LINE_THICK / 2)}px`,
          width: "28px",
          height: `${H_LINE_THICK}px`,
          background: "#000",
          transform: "translateX(0)",
        }}
      />
    
      <div
        style={{
          position: "absolute",
          left: `${SIDE_INSET - 14}px`,
          top: `${bottomLineTop - Math.floor(H_LINE_THICK / 2)}px`,
          width: "28px",
          height: `${H_LINE_THICK}px`,
          background: "#000",
        }}
      />
     
      <div
        style={{
          position: "absolute",
          right: `${SIDE_INSET - 14}px`,
          top: `${topLineTop - Math.floor(H_LINE_THICK / 2)}px`,
          width: "28px",
          height: `${H_LINE_THICK}px`,
          background: "#000",
        }}
      />
    
      <div
        style={{
          position: "absolute",
          right: `${SIDE_INSET - 14}px`,
          top: `${bottomLineTop - Math.floor(H_LINE_THICK / 2)}px`,
          width: "28px",
          height: `${H_LINE_THICK}px`,
          background: "#000",
        }}
      />

     
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          zIndex: 10,
        }}
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          Resume Score
        </h1>
      </div>
    </div>
  );
}

export default ResumeScoreExact;