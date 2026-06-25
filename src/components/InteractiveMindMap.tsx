import { useState, useRef, useEffect, MouseEvent, WheelEvent } from "react";
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
      
      // ── Format 1: hierarchical { name, children[] } ──────────────────────
      if (typeof parsed.name === "string") {
        const sanitizeNode = (node: any): MindMapNode => ({
          name: String(node.name || ""),
          children: Array.isArray(node.children) ? node.children.map(sanitizeNode) : []
        });
        return sanitizeNode(parsed);
      }
      
      // ── Format 2: flat graph { nodes[], connections[] } ───────────────────
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.connections)) {
        const nodeMap: Record<string, MindMapNode & { id: string }> = {};
        
        // Build a map of id → { id, name, children }
        for (const n of parsed.nodes) {
          nodeMap[String(n.id)] = { id: String(n.id), name: String(n.text || n.name || n.id), children: [] };
        }
        
        // Track which nodes have incoming edges (non-root)
        const hasParent = new Set<string>();
        for (const c of parsed.connections) {
          const from = String(c.from ?? c.source);
          const to   = String(c.to   ?? c.target);
          if (nodeMap[from] && nodeMap[to]) {
            nodeMap[from].children.push(nodeMap[to]);
            hasParent.add(to);
          }
        }
        
        // The root is the node with no incoming edges
        const roots = Object.values(nodeMap).filter(n => !hasParent.has(n.id));
        if (roots.length === 1) return roots[0];
        
        // If multiple roots exist (disconnected or multi-root graph), wrap them
        if (roots.length > 1) {
          return { name: "Mind Map", children: roots };
        }
        
        // Fallback: use first node as root
        const first = Object.values(nodeMap)[0];
        if (first) return first;
      }
    }
  } catch (_) {}
  
  return parseOutlineText(text);
};

export default function InteractiveMindMap({ content, title }: InteractiveMindMapProps) {
  const rootNode = parseContent(content);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Helper to calculate node width dynamically based on text length
  const getNodeWidth = (label: string) => {
    return Math.max(120, label.length * 6.5 + 24);
  };

  // Gather all leaves and compute their widths
  interface LeafPos {
    gIdx: number;
    lIdx: number;
    node: MindMapNode;
    name: string;
    width: number;
  }
  const allLeaves: LeafPos[] = [];
  let totalLeafRowWidth = 0;
  
  rootNode.children.forEach((group, gIdx) => {
    group.children.forEach((leaf, lIdx) => {
      const nodeW = getNodeWidth(leaf.name);
      allLeaves.push({ gIdx, lIdx, node: leaf, name: leaf.name, width: nodeW });
      totalLeafRowWidth += nodeW;
    });
  });
  
  const totalLeaves = allLeaves.length;
  const leafGap = 25; // 25px gap between card borders
  if (totalLeaves > 0) {
    totalLeafRowWidth += (totalLeaves - 1) * leafGap;
  }

  // Determine canvas width dynamically to prevent overlaps based on leaf count & node widths
  const width = Math.max(640, totalLeafRowWidth + 160);
  const height = 400;

  const cx = width / 2;
  const rootX = cx;
  const rootY = 60;

  const nodes: { id: string; label: string; x: number; y: number; level: number; width: number }[] = [];
  const links: { source: { x: number; y: number }; target: { x: number; y: number } }[] = [];

  nodes.push({ 
    id: "root", 
    label: rootNode.name, 
    x: rootX, 
    y: rootY, 
    level: 0,
    width: getNodeWidth(rootNode.name)
  });

  // 1. Position Leaf Nodes (Level 2) sequentially
  const leafStartX = cx - totalLeafRowWidth / 2;
  const leafPositions: Record<string, number> = {};
  
  let currentX = leafStartX;
  allLeaves.forEach((leaf) => {
    const lX = currentX + leaf.width / 2;
    const lY = 280;
    const lId = `l-${leaf.gIdx}-${leaf.lIdx}`;
    nodes.push({ id: lId, label: leaf.name, x: lX, y: lY, level: 2, width: leaf.width });
    leafPositions[lId] = lX;
    
    currentX += leaf.width + leafGap;
  });

  // 2. Position Group Nodes (Level 1) centered above their children leaves
  const groupCount = rootNode.children.length;
  if (groupCount > 0) {
    const groupSpacing = Math.min(width / (groupCount + 0.5), 180);
    const defaultStartX = cx - ((groupCount - 1) * groupSpacing) / 2;

    rootNode.children.forEach((group, gIdx) => {
      const gId = `g-${gIdx}`;
      const gY = 160;
      const gWidth = getNodeWidth(group.name);
      
      let gX = 0;
      const leafCount = group.children.length;
      if (leafCount > 0) {
        let sumX = 0;
        group.children.forEach((_, lIdx) => {
          const lId = `l-${gIdx}-${lIdx}`;
          sumX += leafPositions[lId] || 0;
        });
        gX = sumX / leafCount;
      } else {
        gX = defaultStartX + gIdx * groupSpacing;
      }

      nodes.push({ id: gId, label: group.name, x: gX, y: gY, level: 1, width: gWidth });
      links.push({ source: { x: rootX, y: rootY }, target: { x: gX, y: gY } });

      group.children.forEach((_, lIdx) => {
        const lId = `l-${gIdx}-${lIdx}`;
        const lX = leafPositions[lId];
        if (lX !== undefined) {
          links.push({ source: { x: gX, y: gY }, target: { x: lX, y: 280 } });
        }
      });
    });
  }

  const handlePointerDown = (e: MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    const nextScale = e.deltaY < 0 
      ? Math.min(scale + zoomIntensity, 2.5) 
      : Math.max(scale - zoomIntensity, 0.4);
    setScale(nextScale);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.15, 0.4));
  const handleRecenter = () => {
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  const handleExport = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    
    // Clone original SVG to manipulate properties for standalone download
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute("class");
    
    // Set a solid background color on the exported SVG matching the current theme background
    const themeBg = window.getComputedStyle(document.body).backgroundColor || "#ffffff";
    clone.style.backgroundColor = themeBg;
    
    // Get all nested child elements
    const originalElements = Array.from(svgEl.querySelectorAll("*"));
    const clonedElements = Array.from(clone.querySelectorAll("*"));
    
    originalElements.forEach((orig, idx) => {
      const cloned = clonedElements[idx] as HTMLElement;
      if (!cloned) return;
      
      const style = window.getComputedStyle(orig);
      cloned.removeAttribute("class"); // Clear responsive classes to avoid stylesheet overrides
      
      // Resolve fills & strokes into solid color styles for rect, circle, path
      if (orig.tagName === "rect" || orig.tagName === "circle" || orig.tagName === "path") {
        const fill = style.fill;
        const stroke = style.stroke;
        
        if (fill && fill !== "none") {
          cloned.setAttribute("fill", fill);
        }
        if (stroke && stroke !== "none") {
          cloned.setAttribute("stroke", stroke);
        }
      }
      
      // Resolve text fill, font family, sizes and weights for typography
      if (orig.tagName === "text") {
        const fill = style.fill;
        cloned.setAttribute("fill", fill || "black");
        cloned.style.fontFamily = style.fontFamily || "sans-serif";
        cloned.style.fontSize = style.fontSize || "9px";
        cloned.style.fontWeight = style.fontWeight || "bold";
      }
    });
    
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "mindmap"}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col border border-border bg-card rounded-2xl overflow-hidden shadow-sm relative group h-full min-h-[360px]">
      {/* Top Toolbar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 bg-background/80 backdrop-blur-sm border border-border/60 p-1.5 rounded-xl shadow-xs">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer" onClick={handleRecenter} title="Recenter">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <div className="w-[1px] h-4 bg-border/60 mx-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer" onClick={handleExport} title="Export SVG">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* SVG Canvas Area */}
      <svg
        ref={svgRef}
        className={cn(
          "w-full h-full bg-muted/5 cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onWheel={handleWheel}
        viewBox={`0 0 ${width} ${height}`}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* Bezier Links */}
          {links.map((link, idx) => {
            const dx = link.target.x - link.source.x;
            const dy = link.target.y - link.source.y;
            const pathData = `M ${link.source.x} ${link.source.y} C ${link.source.x} ${link.source.y + dy / 2}, ${link.target.x} ${link.target.y - dy / 2}, ${link.target.x} ${link.target.y}`;
            return (
              <path
                key={idx}
                d={pathData}
                className="fill-none stroke-primary/30"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                x={-node.width / 2}
                y={-18}
                width={node.width}
                height={36}
                rx={8}
                strokeWidth={1.5}
                className={cn(
                  "shadow-sm",
                  node.level === 0 
                    ? "fill-primary stroke-none" 
                    : "fill-card stroke-border"
                )}
              />
              <text
                dy={4}
                textAnchor="middle"
                className={cn(
                  "select-none pointer-events-none font-bold",
                  node.level === 0 
                    ? "fill-primary-foreground text-[10px]" 
                    : "fill-foreground text-[9px]"
                )}
              >
                {node.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-semibold bg-background/50 backdrop-blur-xs px-2 py-1 rounded-lg border border-border/40">
        <BrainCircuit className="h-3.5 w-3.5 text-primary" />
        <span>Drag to pan · Scroll to zoom</span>
      </div>
    </div>
  );
}

// Utility class merger helper
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
