import { useState, useRef, useEffect, useCallback, MouseEvent, WheelEvent } from "react";
import { ZoomIn, ZoomOut, Maximize2, Download, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MindMapNode {
  name: string;
  children: MindMapNode[];
}

interface InteractiveMindMapProps {
  content: string;
  title?: string;
}

const parseOutlineText = (text: string): MindMapNode => {
  const lines = text.split("\n").map(l => l.replace(/\r/g, "")).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { name: "Root", children: [] };
  const rootName = lines[0].replace(/[├└─││]/g, "").trim();
  const root: MindMapNode = { name: rootName, children: [] };
  let currentGroup: MindMapNode | null = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const isSubChild = line.includes("│") || line.match(/^[ ├──└─]{4,}/) || (line.startsWith(" ") && line.trim().startsWith("├──") || line.trim().startsWith("└──"));
    const name = line.replace(/[├└─││]/g, "").trim();
    if (isSubChild && currentGroup) {
      currentGroup.children.push({ name, children: [] });
    } else {
      const group: MindMapNode = { name, children: [] };
      root.children.push(group);
      currentGroup = group;
    }
  }
  return root;
};

const parseContent = (text: string): MindMapNode => {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.name === "string") {
        const sanitizeNode = (node: any): MindMapNode => ({
          name: String(node.name || ""),
          children: Array.isArray(node.children) ? node.children.map(sanitizeNode) : []
        });
        return sanitizeNode(parsed);
      }
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.connections)) {
        const nodeMap: Record<string, MindMapNode & { id: string }> = {};
        for (const n of parsed.nodes) {
          nodeMap[String(n.id)] = { id: String(n.id), name: String(n.text || n.name || n.id), children: [] };
        }
        const hasParent = new Set<string>();
        for (const c of parsed.connections) {
          const from = String(c.from ?? c.source);
          const to   = String(c.to   ?? c.target);
          if (nodeMap[from] && nodeMap[to]) {
            nodeMap[from].children.push(nodeMap[to]);
            hasParent.add(to);
          }
        }
        const roots = Object.values(nodeMap).filter(n => !hasParent.has(n.id));
        if (roots.length === 1) return roots[0];
        if (roots.length > 1) return { name: "Mind Map", children: roots };
        const first = Object.values(nodeMap)[0];
        if (first) return first;
      }
    }
  } catch (_) {}
  return parseOutlineText(text);
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const CANVAS_PAD   = 40;   // padding around entire graph
const LEAF_GAP     = 20;   // horizontal gap between leaf cards
const GROUP_MIN_GAP = 16;  // minimum horizontal gap between group cards
const ROOT_Y       = 70;
const GROUP_Y      = 190;
const LEAF_Y       = 310;
const LINE_H       = 13;

export default function InteractiveMindMap({ content, title }: InteractiveMindMapProps) {
  const rootNode = parseContent(content);
  const svgRef   = useRef<SVGSVGElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  const [pan,        setPan]        = useState({ x: 0, y: 0 });
  const [scale,      setScale]      = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart,  setDragStart]  = useState({ x: 0, y: 0 });
  const [fitted,     setFitted]     = useState(false);

  // ── Text wrapping ─────────────────────────────────────────────────────────
  const wrapText = (text: string, maxChars = 18): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    words.forEach(w => {
      if ((cur + " " + w).trim().length <= maxChars) {
        cur = (cur + " " + w).trim();
      } else {
        if (cur) lines.push(cur);
        cur = w.length > maxChars ? w.slice(0, maxChars - 1) + "…" : w;
      }
    });
    if (cur) lines.push(cur);
    return lines.length > 0 ? lines : [text];
  };

  const getNodeDim = (label: string, level: number) => {
    const maxChars = level === 0 ? 20 : level === 1 ? 18 : 16;
    const lines = wrapText(label, maxChars);
    const maxLen = Math.max(...lines.map(l => l.length), 1);
    const width  = Math.max(level === 0 ? 140 : level === 1 ? 120 : 100, maxLen * 6.2 + 20);
    const height = Math.max(34, lines.length * LINE_H + 14);
    return { lines, width, height };
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  type ND = { id: string; label: string; lines: string[]; x: number; y: number; level: number; w: number; h: number };
  type LK = { sx: number; sy: number; tx: number; ty: number };

  const allNodes: ND[] = [];
  const allLinks: LK[] = [];

  // 1. Root node — preliminary (will be re-centered after leaves are placed)
  const rootDim = getNodeDim(rootNode.name, 0);

  // 2. Leaf nodes — measure first
  interface LeafMeta { gIdx: number; lIdx: number; node: MindMapNode; w: number; h: number; lines: string[] }
  const leafMeta: LeafMeta[] = [];
  rootNode.children.forEach((g, gIdx) => {
    g.children.forEach((leaf, lIdx) => {
      const d = getNodeDim(leaf.name, 2);
      leafMeta.push({ gIdx, lIdx, node: leaf, w: d.width, h: d.height, lines: d.lines });
    });
  });

  const totalLeafW = leafMeta.reduce((s, l) => s + l.w, 0) + Math.max(0, leafMeta.length - 1) * LEAF_GAP;
  const leafStartX = CANVAS_PAD + (leafMeta.length === 0 ? 0 : 0);

  // 3. Place leaves left-to-right
  const leafXMap: Record<string, number> = {};
  let curX = leafStartX;
  leafMeta.forEach(lm => {
    const lx = curX + lm.w / 2;
    const id = `l-${lm.gIdx}-${lm.lIdx}`;
    leafXMap[id] = lx;
    allNodes.push({ id, label: lm.node.name, lines: lm.lines, x: lx, y: LEAF_Y, level: 2, w: lm.w, h: lm.h });
    curX += lm.w + LEAF_GAP;
  });

  // 4. Canvas width from actual leaf spread
  const contentW = Math.max(rootDim.width + CANVAS_PAD * 2, totalLeafW + CANVAS_PAD * 2);
  const cx = contentW / 2;

  // 5. Place group nodes centered over their leaves (or evenly if no leaves)
  const groupCount = rootNode.children.length;
  rootNode.children.forEach((group, gIdx) => {
    const gId  = `g-${gIdx}`;
    const gDim = getNodeDim(group.name, 1);
    let gx = cx;

    if (group.children.length > 0) {
      let sumX = 0;
      group.children.forEach((_, lIdx) => {
        sumX += leafXMap[`l-${gIdx}-${lIdx}`] ?? cx;
      });
      gx = sumX / group.children.length;
    } else if (groupCount > 1) {
      const spread = contentW - CANVAS_PAD * 2;
      gx = CANVAS_PAD + (gIdx / (groupCount - 1)) * spread;
    }

    allNodes.push({ id: gId, label: group.name, lines: gDim.lines, x: gx, y: GROUP_Y, level: 1, w: gDim.width, h: gDim.height });

    // Connect group → leaves
    group.children.forEach((_, lIdx) => {
      const lId = `l-${gIdx}-${lIdx}`;
      const lx  = leafXMap[lId] ?? gx;
      allLinks.push({ sx: gx, sy: GROUP_Y, tx: lx, ty: LEAF_Y });
    });

    // Root → group link (deferred until root position is known)
    allLinks.push({ sx: cx, sy: ROOT_Y, tx: gx, ty: GROUP_Y });
  });

  // 6. Root node centered on canvas
  allNodes.push({ id: "root", label: rootNode.name, lines: rootDim.lines, x: cx, y: ROOT_Y, level: 0, w: rootDim.width, h: rootDim.height });

  // ── Canvas dimensions: enough for deepest node + padding ─────────────────
  const deepestY = leafMeta.length > 0 ? LEAF_Y : GROUP_Y;
  const maxNodeH = Math.max(...allNodes.map(n => n.h), 40);
  const canvasH  = deepestY + maxNodeH / 2 + CANVAS_PAD;
  const canvasW  = contentW;

  // ── Auto-fit on first render (scale + center) ─────────────────────────────
  const fitToView = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const { clientWidth: vw, clientHeight: vh } = wrap;
    if (vw === 0 || vh === 0) return;

    const scaleX = vw  / canvasW;
    const scaleY = vh  / canvasH;
    const fit    = Math.min(scaleX, scaleY, 1) * 0.94; // never upscale beyond 100%

    const panX = (vw  - canvasW  * fit) / 2;
    const panY = (vh  - canvasH  * fit) / 2;

    setScale(fit);
    setPan({ x: panX, y: panY });
  }, [canvasW, canvasH]);

  useEffect(() => {
    if (!fitted) {
      fitToView();
      setFitted(true);
    }
  }, [fitted, fitToView]);

  // Re-fit when container resizes
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => { setFitted(false); });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // ── Interaction ───────────────────────────────────────────────────────────
  const handlePointerDown = (e: MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handlePointerMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handlePointerUp = () => setIsDragging(false);

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.06 : 0.94;
    setScale(prev => Math.min(Math.max(prev * factor, 0.2), 3));
  };

  const handleZoomIn  = () => setScale(p => Math.min(p + 0.12, 3));
  const handleZoomOut = () => setScale(p => Math.max(p - 0.12, 0.2));
  const handleRecenter = () => { setFitted(false); };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width",  String(canvasW));
    clone.setAttribute("height", String(canvasH));
    const bg = window.getComputedStyle(document.body).backgroundColor || "#0f172a";
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%"); bgRect.setAttribute("height", "100%"); bgRect.setAttribute("fill", bg);
    clone.insertBefore(bgRect, clone.firstChild);
    const src = new XMLSerializer().serializeToString(clone);
    const a = document.createElement("a");
    a.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
    a.download = `${title || "mindmap"}.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── Node colours ──────────────────────────────────────────────────────────
  const nodeFill  = (level: number) =>
    level === 0 ? "hsl(263 80% 60%)"
    : level === 1 ? "hsl(263 40% 20%)"
    : "hsl(220 20% 16%)";
  const nodeStroke = (level: number) =>
    level === 0 ? "none"
    : level === 1 ? "hsl(263 50% 38%)"
    : "hsl(220 20% 28%)";
  const textFill = (level: number) =>
    level === 0 ? "#fff" : level === 1 ? "hsl(263 80% 80%)" : "hsl(220 15% 75%)";
  const linkColor = (targetLevel: number) =>
    targetLevel === 1 ? "hsl(263 50% 45%)" : "hsl(220 20% 35%)";

  return (
    <div
      ref={wrapRef}
      className="flex flex-col border border-border bg-card rounded-2xl overflow-hidden shadow-sm relative group h-full min-h-[360px]"
    >
      {/* Toolbar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 bg-background/80 backdrop-blur-sm border border-border/60 p-1.5 rounded-xl shadow-xs">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleZoomIn}    title="Zoom In"><ZoomIn  className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleZoomOut}   title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleRecenter}  title="Fit to frame"><Maximize2 className="h-4 w-4" /></Button>
        <div className="w-[1px] h-4 bg-border/60 mx-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleExport}    title="Export SVG"><Download className="h-4 w-4" /></Button>
      </div>

      {/* SVG canvas — fills the wrapper, no fixed viewBox so CSS drives the size */}
      <svg
        ref={svgRef}
        className={cn("w-full h-full bg-muted/5", isDragging ? "cursor-grabbing" : "cursor-grab")}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Translate + scale group; origin is top-left of canvas */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>

          {/* Links */}
          {allLinks.map((lk, idx) => {
            const level = lk.ty === LEAF_Y ? 2 : 1;
            const my    = (lk.sy + lk.ty) / 2;
            return (
              <path
                key={idx}
                d={`M ${lk.sx} ${lk.sy} C ${lk.sx} ${my}, ${lk.tx} ${my}, ${lk.tx} ${lk.ty}`}
                fill="none"
                stroke={linkColor(level)}
                strokeWidth={level === 1 ? 1.5 : 1}
                strokeOpacity={0.7}
              />
            );
          })}

          {/* Nodes */}
          {allNodes.map(nd => {
            const rx = nd.level === 0 ? 12 : nd.level === 1 ? 10 : 8;
            return (
              <g key={nd.id} transform={`translate(${nd.x}, ${nd.y})`}>
                <rect
                  x={-nd.w / 2} y={-nd.h / 2}
                  width={nd.w}  height={nd.h}
                  rx={rx}
                  fill={nodeFill(nd.level)}
                  stroke={nodeStroke(nd.level)}
                  strokeWidth={1.5}
                />
                {nd.lines.map((line, li) => {
                  const totalH = (nd.lines.length - 1) * LINE_H;
                  const dy     = -totalH / 2 + li * LINE_H + 1;
                  return (
                    <text
                      key={li}
                      y={dy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={textFill(nd.level)}
                      fontSize={nd.level === 0 ? 10 : 9}
                      fontWeight={nd.level === 0 ? 700 : nd.level === 1 ? 600 : 500}
                      style={{ fontFamily: "sans-serif", userSelect: "none", pointerEvents: "none" }}
                    >
                      {line}
                    </text>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hint */}
      <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-semibold bg-background/50 backdrop-blur-xs px-2 py-1 rounded-lg border border-border/40">
        <BrainCircuit className="h-3.5 w-3.5 text-primary" />
        <span>Drag to pan · Scroll to zoom · ⊡ to fit</span>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
