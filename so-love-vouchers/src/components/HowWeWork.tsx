import { useEffect, useRef, useState } from "react";

const ORANGE = "#fd5303";
const NAVY   = "#222639";

const steps = [
  {
    number: "01",
    title: "Clarity first",
    body: "We turn financial complexity into clear, decision-ready insight — no jargon, no noise.",
  },
  {
    number: "02",
    title: "Commercially grounded",
    body: "Recommendations are practical, value-focused, and built to withstand boardroom scrutiny.",
  },
  {
    number: "03",
    title: "Disciplined execution",
    body: "Ambition matched with the structure and precision that funders and investors expect.",
  },
  {
    number: "04",
    title: "Measurable value",
    body: "We focus on the decisions that move capital efficiency and enterprise value.",
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useLineProgress(active: boolean, duration = 1300) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      setProgress(e);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, duration]);
  return progress;
}

export function HowWeWork() {
  const { ref, inView } = useInView(0.1);
  const lineProgress    = useLineProgress(inView);
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    steps.forEach((_, i) => setTimeout(() => setActiveStep(i), 150 + i * 190));
  }, [inView]);

  // SVG viewBox width; dots at 1/8, 3/8, 5/8, 7/8
  const VW = 1000;
  const dotXs = [125, 375, 625, 875];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

        .hw-root, .hw-root * { box-sizing: border-box; font-family: 'Montserrat', sans-serif; }

        /* ── shell ── */
        .hw-shell {
          background: #ffffff;
          width: 100%;
          padding: clamp(48px, 7vw, 100px) clamp(20px, 6vw, 100px);
        }

        /* ── inner constrained ── */
        .hw-inner {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
        }

        /* ════ DESKTOP (≥ 700px) ════ */
        .hw-desktop { display: block; }
        .hw-mobile  { display: none;  }
        @media (max-width: 699px) {
          .hw-desktop { display: none;  }
          .hw-mobile  { display: block; }
        }

        /* connector SVG row */
        .hw-svg-wrap {
          width: 100%;
          margin-bottom: clamp(24px, 3vw, 44px);
          line-height: 0;
        }
        .hw-svg-wrap svg {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }

        /* 4-column grid */
        .hw-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }

        .hw-col {
          padding: 0 clamp(14px, 2.2vw, 36px);
          border-left: 1px solid #ebebeb;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .hw-col:first-child { border-left: none; padding-left: 0; }
        .hw-col:last-child  { padding-right: 0; }
        .hw-col.vis { opacity: 1; transform: translateY(0); }

        .hw-num {
          display: block;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: ${ORANGE};
          margin-bottom: clamp(10px, 1.2vw, 18px);
        }
        .hw-title {
          font-size: clamp(14px, 1.25vw, 18px);
          font-weight: 700;
          color: ${NAVY};
          line-height: 1.3;
          margin: 0 0 clamp(8px, 1vw, 14px);
          letter-spacing: -0.01em;
        }
        .hw-body {
          font-size: clamp(11px, 0.8vw, 13px);
          font-weight: 500;
          color: #888;
          line-height: 1.85;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin: 0;
        }

        /* SVG elements */
        .hw-track { stroke: #e8e8e8; stroke-width: 1.5; fill: none; }
        .hw-fill  { stroke: ${ORANGE}; stroke-width: 2.5; fill: none; stroke-linecap: round; }
        .hw-ring  {
          fill: none; stroke: ${ORANGE}; stroke-width: 2; opacity: 0;
          transform-box: fill-box; transform-origin: center;
        }
        .hw-ring.on { opacity: 1; animation: hw-pulse 2.4s ease-out infinite; }
        @keyframes hw-pulse {
          0%   { r: 7;  opacity: 0.65; }
          100% { r: 18; opacity: 0;    }
        }

        /* ════ MOBILE (< 700px) ════ */
        .hm-list {
          display: flex;
          flex-direction: column;
          max-width: 480px;
          margin: 0 auto;
        }

        .hm-item {
          display: grid;
          grid-template-columns: 36px 1fr;
          gap: 0 18px;
          padding-bottom: 36px;
          opacity: 0;
          transform: translateX(-14px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .hm-item:last-child { padding-bottom: 0; }
        .hm-item.vis { opacity: 1; transform: translateX(0); }

        .hm-track-col {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .hm-dot-wrap {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
        }
        .hm-dot {
          width: 11px; height: 11px; border-radius: 50%;
          background: #e0e0e0;
          transition: background 0.3s ease;
          position: relative; z-index: 1;
        }
        .hm-dot.on { background: ${ORANGE}; }
        .hm-dot.on::after {
          content: '';
          position: absolute; inset: -5px; border-radius: 50%;
          border: 1.5px solid ${ORANGE};
          animation: hm-pulse 2.2s ease-out infinite;
        }
        @keyframes hm-pulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.6); opacity: 0;   }
        }
        .hm-seg {
          flex: 1; width: 2px; background: #e8e8e8;
          margin-top: 3px; position: relative; overflow: hidden; min-height: 16px;
        }
        .hm-seg-fill {
          position: absolute; top: 0; left: 0; right: 0;
          background: ${ORANGE};
          transition: height 0.55s cubic-bezier(.4,0,.2,1);
        }

        .hm-content { padding-top: 6px; }
        .hm-num {
          display: block;
          font-size: 18px; font-weight: 800;
          letter-spacing: 0.18em; color: ${ORANGE};
          margin-bottom: 6px;
        }
        .hm-title {
          font-size: 16px; font-weight: 700;
          color: ${NAVY}; margin: 0 0 8px; line-height: 1.3;
        }
        .hm-body {
          font-size: 12px; font-weight: 500;
          color: #888; line-height: 1.85;
          letter-spacing: 0.04em; text-transform: uppercase; margin: 0;
        }
      `}</style>

      <div className="hw-root" ref={ref}>
        <div className="hw-shell">
          <div className="hw-inner">

            {/* ══ DESKTOP ══ */}
            <div className="hw-desktop">

              {/* animated connector */}
              <div className="hw-svg-wrap">
                <svg viewBox={`0 0 ${VW} 40`} preserveAspectRatio="none">
                  {/* track */}
                  <line className="hw-track" x1="0" y1="20" x2={VW} y2="20" />
                  {/* animated orange fill */}
                  <line
                    className="hw-fill"
                    x1="0" y1="20"
                    x2={lineProgress * VW} y2="20"
                  />
                  {dotXs.map((cx, i) => {
                    const on = lineProgress * VW >= cx;
                    return (
                      <g key={i}>
                        {/* pulse ring */}
                        <circle
                          className={`hw-ring${on ? " on" : ""}`}
                          cx={cx} cy="20" r="7"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                        {/* solid dot */}
                        <circle
                          cx={cx} cy="20" r="6"
                          fill={on ? ORANGE : "#e8e8e8"}
                          style={{ transition: "fill 0.25s ease" }}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* 4 step cards */}
              <div className="hw-grid">
                {steps.map((s, i) => (
                  <div
                    key={s.number}
                    className={`hw-col${activeStep >= i ? " vis" : ""}`}
                    style={{ transitionDelay: `${i * 0.07}s` }}
                  >
                    <span className="hw-num">{s.number}</span>
                    <h3 className="hw-title">{s.title}</h3>
                    <p className="hw-body">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ══ MOBILE ══ */}
            <div className="hw-mobile">
              <div className="hm-list">
                {steps.map((s, i) => {
                  const on      = activeStep >= i;
                  const isLast  = i === steps.length - 1;
                  const segOn   = activeStep >= i + 1;
                  return (
                    <div
                      key={s.number}
                      className={`hm-item${on ? " vis" : ""}`}
                      style={{ transitionDelay: `${i * 0.1}s` }}
                    >
                      <div className="hm-track-col">
                        <div className="hm-dot-wrap">
                          <div className={`hm-dot${on ? " on" : ""}`} />
                        </div>
                        {!isLast && (
                          <div className="hm-seg">
                            <div className="hm-seg-fill" style={{ height: segOn ? "100%" : "0%" }} />
                          </div>
                        )}
                      </div>
                      <div className="hm-content">
                        <span className="hm-num">{s.number}</span>
                        <h3 className="hm-title">{s.title}</h3>
                        <p className="hm-body">{s.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
