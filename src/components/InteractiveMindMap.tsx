/**
 * InteractiveMindMap — Reingold-Tilford Tree Layout
 *
 * Layout algorithm (2 passes):
 *   Pass 1 (bottom-up): Each node's "subtree width" = sum of its children's
 *                        subtree widths + gaps between them.
 *   Pass 2 (top-down):  Place each node centered over its children's span.
 *                        Y is purely level × LEVEL_HEIGHT.
 *
 * Result: perfectly balanced, non-overlapping, evenly distributed tree.
 */

import { useState, useRef, useEffect, useCallback, MouseEvent, WheelEvent } from "react";
import { ZoomIn, ZoomOut, Maximize2, Download, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MindMapNode {
  name: string;
  children: MindMapNode[];
}

interface InteractiveMindMapProps {
  content: string;
  title?: string;
}

// Internal layout node (mutable during computation)
interface LayoutNode {
  name: string;
  children: LayoutNode[];
  level: number;
  // Set during Pass 1
  subtreeW: number;
  nodeW: number;
  nodeH: number;
  lines: string[];
  // Set during Pass 2
  x: number;
  y: number;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const LEVEL_H    = 110;  // px between level rows (center-to-center)
const SIBLING_GAP = 24;  // horizontal gap between adjacent subtrees
const CANVAS_PAD  = 48;  // padding around the whole diagram
const LINE_H      = 13;  // px per text line

// ─── Content parsers ──────────────────────────────────────────────────────────

const parseOutlineText = (text: string): MindMapNode => {
  const lines = text.split("\n").map(l => l.replace(/\r/g, "")).filter(l => l.trim());
  if (!lines.length) return { name: "Root", children: [] };
  const rootName = lines[0].replace(/[├└─│]/g, "").trim();
  const root: MindMapNode = { name: rootName, children: [] };
  let cur: MindMapNode | null = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const isSub = line.includes("│") || /^[ ├──└─]{4,}/.test(line) ||
                  (line.startsWith(" ") && (line.trim().startsWith("├──") || line.trim().startsWith("└──")));
    const name = line.replace(/[├└─│]/g, "").trim();
    if (isSub && cur) {
      cur.children.push({ name, children: [] });
    } else {
      const g: MindMapNode = { name, children: [] };
      root.children.push(g);
      cur = g;
    }
  }
  return root;
};

const parseContent = (text: string): MindMapNode => {
  try {
    const p = JSON.parse(text);
    if (p && typeof p === "object") {
      if (typeof p.name === "string") {
        const san = (n: any): MindMapNode => ({ name: String(n.name ?? ""), children: Array.isArray(n.children) ? n.children.map(san) : [] });
        return san(p);
      }
      if (Array.isArray(p.nodes) && Array.isArray(p.connections)) {
        const map: Record<string, MindMapNode & { id: string }> = {};
        for (const n of p.nodes) map[String(n.id)] = { id: String(n.id), name: String(n.text ?? n.name ?? n.id), children: [] };
        const hasParent = new Set<string>();
        for (const c of p.connections) {
          const from = String(c.from ?? c.source), to = String(c.to ?? c.target);
          if (map[from] && map[to]) { map[from].children.push(map[to]); hasParent.add(to); }
        }
        const roots = Object.values(map).filter(n => !hasParent.has(n.id));
        if (roots.length === 1) return roots[0];
        if (roots.length > 1) return { name: "Mind Map", children: roots };
        const first = Object.values(map)[0];
        if (first) return first;
      }
    }
  } catch (_) {}
  return parseOutlineText(text);
};

// ─── Text helpers ─────────────────────────────────────────────────────────────

const wrapText = (text: string, maxChars: number): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length <= maxChars) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars - 1) + "…" : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
};

const getNodeDim = (name: string, level: number) => {
  const maxChars = level === 0 ? 22 : level === 1 ? 18 : 15;
  const lines    = wrapText(name, maxChars);
  const maxLen   = Math.max(...lines.map(l => l.length), 1);
  // Width scales with longest line; level 0 gets more room
  const minW = level === 0 ? 150 : level === 1 ? 120 : 100;
  const w    = Math.max(minW, maxLen * 6.5 + 24);
  const h    = Math.max(34, lines.length * LINE_H + 16);
  return { w, h, lines };
};

// ─── Reingold-Tilford layout (simplified, top-to-bottom) ─────────────────────

/** Pass 1 — annotate each node with its natural subtree width. */
function measureSubtree(node: MindMapNode, level: number): LayoutNode {
  const { w, h, lines } = getNodeDim(node.name, level);
  const children = node.children.map(c => measureSubtree(c, level + 1));

  let subtreeW: number;
  if (children.length === 0) {
    // Leaf: its slot is its own node width + a uniform side gap
    subtreeW = w + SIBLING_GAP;
  } else {
    // Internal: slot = sum of children slots (gaps already baked in)
    subtreeW = children.reduce((s, c) => s + c.subtreeW, 0);
    // Never narrower than the node itself
    subtreeW = Math.max(subtreeW, w + SIBLING_GAP);
  }

  return { name: node.name, children, level, subtreeW, nodeW: w, nodeH: h, lines, x: 0, y: 0 };
}

/** Pass 2 — assign X/Y coordinates top-down. `startX` = left edge of this subtree's slot. */
function placeNodes(node: LayoutNode, startX: number): void {
  // Center this node horizontally over its subtree slot
  node.x = startX + node.subtreeW / 2;
  node.y = CANVAS_PAD + node.level * LEVEL_H;

  // Place children left-to-right, each in their own slot
  let childX = startX;
  for (const child of node.children) {
    placeNodes(child, childX);
    childX += child.subtreeW;
  }
}

/** Flatten the tree into arrays suitable for SVG rendering. */
function flattenTree(node: LayoutNode, nodes: LayoutNode[], links: { sx: number; sy: number; tx: number; ty: number }[]) {
  nodes.push(node);
  for (const child of node.children) {
    links.push({ sx: node.x, sy: node.y, tx: child.x, ty: child.y });
    flattenTree(child, nodes, links);
  }
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

const LEVEL_COLORS = [
  { fill: "hsl(263 75% 58%)",  stroke: "none",                  text: "#fff" },           // 0 root
  { fill: "hsl(263 35% 22%)",  stroke: "hsl(263 50% 40%)",      text: "hsl(263 80% 82%)" }, // 1
  { fill: "hsl(220 22% 17%)",  stroke: "hsl(220 20% 32%)",      text: "hsl(220 15% 76%)" }, // 2
  { fill: "hsl(200 22% 15%)",  stroke: "hsl(200 20% 30%)",      text: "hsl(200 15% 72%)" }, // 3+
];
const levelColor = (level: number) => LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];

const LINK_COLORS = ["hsl(263 50% 46%)", "hsl(220 25% 38%)", "hsl(200 20% 34%)"];
const linkColor = (level: number) => LINK_COLORS[Math.min(level, LINK_COLORS.length - 1)];

function cn(...cls: (string | false | undefined)[]) { return cls.filter(Boolean).join(" "); }

// ─── Component ────────────────────────────────────────────────────────────────

export default function InteractiveMindMap({ content, title }: InteractiveMindMapProps) {
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const [pan,        setPan]        = useState({ x: 0, y: 0 });
  const [scale,      setScale]      = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart,  setDragStart]  = useState({ x: 0, y: 0 });
  const [needsFit,   setNeedsFit]   = useState(true);

  // ── Run layout algorithm ──────────────────────────────────────────────────
  const rawRoot  = parseContent(content);
  const laidRoot = measureSubtree(rawRoot, 0);
  placeNodes(laidRoot, CANVAS_PAD / 2);

  const allNodes: LayoutNode[] = [];
  const allLinks: { sx: number; sy: number; tx: number; ty: number }[] = [];
  flattenTree(laidRoot, allNodes, allLinks);

  // ── Canvas bounding box from actual node positions ────────────────────────
  const maxX = Math.max(...allNodes.map(n => n.x + n.nodeW / 2)) + CANVAS_PAD / 2;
  const maxY = Math.max(...allNodes.map(n => n.y + n.nodeH / 2)) + CANVAS_PAD;
  const canvasW = Math.max(maxX, 400);
  const canvasH = Math.max(maxY, 300);

  // ── Auto-fit to container ─────────────────────────────────────────────────
  const fitToView = useCallback(() => {
    const wrap = svgWrapRef.current;
    if (!wrap) return;
    const vw = wrap.clientWidth;
    const vh = wrap.clientHeight;
    if (!vw || !vh) return;

    const scaleX = vw  / canvasW;
    const scaleY = vh  / canvasH;
    const fit    = Math.min(scaleX, scaleY) * 0.95; // 95% to leave breathing room

    // Center the scaled canvas inside the viewport
    const panX = (vw  - canvasW  * fit) / 2;
    const panY = (vh  - canvasH  * fit) / 2;

    setScale(fit);
    setPan({ x: panX, y: panY });
  }, [canvasW, canvasH]);

  useEffect(() => {
    if (needsFit) { fitToView(); setNeedsFit(false); }
  }, [needsFit, fitToView]);

  // Refit when container resizes
  useEffect(() => {
    const wrap = svgWrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => setNeedsFit(true));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // ── Interaction ───────────────────────────────────────────────────────────
  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp   = () => setIsDragging(false);

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    // Zoom towards mouse position
    const wrap = svgWrapRef.current;
    if (!wrap) return;
    const rect   = wrap.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    const next   = Math.min(Math.max(scale * factor, 0.15), 4);
    // Adjust pan so point under cursor stays fixed
    const dx = (mouseX - pan.x) * (next / scale - 1);
    const dy = (mouseY - pan.y) * (next / scale - 1);
    setScale(next);
    setPan(p => ({ x: p.x - dx, y: p.y - dy }));
  };

  const handleZoomIn  = () => setScale(p => Math.min(p + 0.12, 4));
  const handleZoomOut = () => setScale(p => Math.max(p - 0.12, 0.15));
  const handleFit     = () => setNeedsFit(true);

  // ── Export ────────────────────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);
  const handleExport = () => {
    const el = svgRef.current;
    if (!el) return;
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width",  String(canvasW));
    clone.setAttribute("height", String(canvasH));
    const bg = window.getComputedStyle(document.body).backgroundColor || "#0f172a";
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%"); bgRect.setAttribute("height", "100%"); bgRect.setAttribute("fill", bg);
    clone.insertBefore(bgRect, clone.firstChild);
    const src = new XMLSerializer().serializeToString(clone);
    const a   = document.createElement("a");
    a.href     = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
    a.download  = `${title || "mindmap"}.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={svgWrapRef}
      className="flex flex-col border border-border bg-card rounded-2xl overflow-hidden shadow-sm relative group h-full min-h-[360px]"
    >
      {/* Toolbar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 bg-background/80 backdrop-blur-sm border border-border/60 p-1.5 rounded-xl shadow-xs">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleZoomIn}  title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleFit}     title="Fit to frame">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <div className="w-[1px] h-4 bg-border/60 mx-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleExport}  title="Export SVG">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* SVG — fills wrapper; pan+scale live in a child <g> */}
      <svg
        ref={svgRef}
        className={cn("w-full h-full bg-muted/5", isDragging ? "cursor-grabbing" : "cursor-grab")}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>

          {/* Links — cubic Bézier, vertically oriented */}
          {allLinks.map((lk, i) => {
            // Determine depth of the target node for colour
            const tNode  = allNodes.find(n => n.x === lk.tx && n.y === lk.ty);
            const tLevel = tNode?.level ?? 1;
            const my     = (lk.sy + lk.ty) / 2;
            return (
              <path
                key={i}
                d={`M ${lk.sx} ${lk.sy} C ${lk.sx} ${my}, ${lk.tx} ${my}, ${lk.tx} ${lk.ty}`}
                fill="none"
                stroke={linkColor(tLevel - 1)}
                strokeWidth={tLevel === 1 ? 1.8 : 1.2}
                strokeOpacity={0.65}
              />
            );
          })}

          {/* Nodes */}
          {allNodes.map((nd, i) => {
            const { fill, stroke, text } = levelColor(nd.level);
            const rx = nd.level === 0 ? 14 : nd.level === 1 ? 10 : 8;
            return (
              <g key={i} transform={`translate(${nd.x},${nd.y})`}>
                {/* Card */}
                <rect
                  x={-nd.nodeW / 2} y={-nd.nodeH / 2}
                  width={nd.nodeW}   height={nd.nodeH}
                  rx={rx}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.5}
                />
                {/* Optional subtle inner glow for root */}
                {nd.level === 0 && (
                  <rect
                    x={-nd.nodeW / 2 + 2} y={-nd.nodeH / 2 + 2}
                    width={nd.nodeW - 4}   height={nd.nodeH - 4}
                    rx={rx - 2}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                  />
                )}
                {/* Text lines — vertically centred */}
                {nd.lines.map((line, li) => {
                  const totalH = (nd.lines.length - 1) * LINE_H;
                  const dy     = -totalH / 2 + li * LINE_H;
                  return (
                    <text
                      key={li}
                      y={dy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={text}
                      fontSize={nd.level === 0 ? 10.5 : nd.level === 1 ? 9.5 : 9}
                      fontWeight={nd.level === 0 ? 700 : nd.level === 1 ? 600 : 500}
                      style={{ fontFamily: "ui-sans-serif,system-ui,sans-serif", userSelect: "none", pointerEvents: "none" }}
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

      {/* Hint bar */}
      <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-semibold bg-background/50 backdrop-blur-xs px-2 py-1 rounded-lg border border-border/40">
        <BrainCircuit className="h-3.5 w-3.5 text-primary" />
        <span>Drag · Scroll to zoom · ⊡ fit to frame</span>
      </div>
    </div>
  );
}
