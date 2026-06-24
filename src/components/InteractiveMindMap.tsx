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

export default function InteractiveMindMap({ content, title }: InteractiveMindMapProps) {
  const rootNode = parseOutlineText(content);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const width = 600;
  const height = 400;

  // Center coordinate
  const cx = width / 2;
  const rootX = cx;
  const rootY = 60;

  // Layout calculations
  const nodes: { id: string; label: string; x: number; y: number; level: number }[] = [];
  const links: { source: { x: number; y: number }; target: { x: number; y: number } }[] = [];

  nodes.push({ id: "root", label: rootNode.name, x: rootX, y: rootY, level: 0 });

  const groupCount = rootNode.children.length;
  if (groupCount > 0) {
    const groupSpacing = Math.min(width / (groupCount + 0.5), 180);
    const startX = cx - ((groupCount - 1) * groupSpacing) / 2;

    rootNode.children.forEach((group, gIdx) => {
      const gX = startX + gIdx * groupSpacing;
      const gY = 160;
      const gId = `g-${gIdx}`;
      nodes.push({ id: gId, label: group.name, x: gX, y: gY, level: 1 });
      links.push({ source: { x: rootX, y: rootY }, target: { x: gX, y: gY } });

      const leafCount = group.children.length;
      if (leafCount > 0) {
        const leafSpacing = Math.min(100, (width * 0.8) / (leafCount + 0.5));
        const leafStartX = gX - ((leafCount - 1) * leafSpacing) / 2;

        group.children.forEach((leaf, lIdx) => {
          const lX = leafStartX + lIdx * leafSpacing;
          const lY = 280;
          const lId = `l-${gIdx}-${lIdx}`;
          nodes.push({ id: lId, label: leaf.name, x: lX, y: lY, level: 2 });
          links.push({ source: { x: gX, y: gY }, target: { x: lX, y: lY } });
        });
      }
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
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
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
                fill="none"
                stroke="var(--primary)"
                strokeOpacity={0.25}
                strokeWidth={1.5}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                x={-60}
                y={-18}
                width={120}
                height={36}
                rx={8}
                fill={node.level === 0 ? "hsl(var(--primary))" : "hsl(var(--card))"}
                stroke={node.level === 0 ? "none" : "hsl(var(--border))"}
                strokeWidth={1.5}
                className="shadow-sm"
              />
              <text
                dy={4}
                textAnchor="middle"
                fill={node.level === 0 ? "white" : "hsl(var(--foreground))"}
                fontSize={node.level === 0 ? "10px" : "9px"}
                fontWeight="bold"
                className="select-none pointer-events-none"
              >
                {node.label.length > 20 ? `${node.label.substring(0, 18)}...` : node.label}
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
