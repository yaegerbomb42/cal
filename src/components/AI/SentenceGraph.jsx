import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './SentenceGraph.css';

const SentenceGraph = ({ data }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [hoverNode, setHoverNode] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!data || !svgRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = 300;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const g = svg.append("g");

        // Defs for glow
        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "glow");
        filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "blur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        const zoom = d3.zoom()
            .scaleExtent([0.5, 2])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        const kindColors = {
            sentence: '#7aa7ff',
            clause: '#b07aff',
            token: '#9bd0ff',
            title: '#48e7a6',
            location: '#ffcc66',
            recurrence: '#ff7ad9',
            time: '#66e3ff',
            duration: '#a0ff66',
            reminder: '#ffd066',
            conflict: '#ff6b6b',
            attendees: '#c7a6ff',
            risk: '#ff6b6b',
            action: '#ffcc66',
        };

        const edgeColors = {
            contains: 'rgba(176,122,255,0.2)',
            evidence: 'rgba(72,231,166,0.25)',
            supports: 'rgba(255,204,102,0.2)',
            blocks: 'rgba(255,107,107,0.25)',
        };

        const nodes = data.nodes.map(d => ({ ...d }));
        const links = data.links.map(d => ({ ...d }));

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(50))
            .force("charge", d3.forceManyBody().strength(-150))
            .force("collide", d3.forceCollide().radius(25))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = g.append("g")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("class", "link")
            .attr("stroke", d => edgeColors[d.type] || 'rgba(255,255,255,0.1)');

        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .on("mouseenter", (event, d) => {
                setHoverNode(d);
                setTooltipPos({ x: event.offsetX, y: event.offsetY });
            })
            .on("mousemove", (event) => {
                setTooltipPos({ x: event.offsetX, y: event.offsetY });
            })
            .on("mouseleave", () => setHoverNode(null))
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        node.append("circle")
            .attr("r", d => d.kind === 'sentence' ? 10 : 6)
            .attr("fill", d => kindColors[d.kind] || '#fff')
            .style("filter", "url(#glow)");

        node.append("text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(d => d.label);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return () => simulation.stop();
    }, [data]);

    return (
        <div className="sentence-graph-container" ref={containerRef}>
            <svg className="sentence-graph-svg" ref={svgRef}></svg>
            {hoverNode && (
                <div
                    className="graph-tooltip"
                    style={{ left: tooltipPos.x + 10, top: tooltipPos.y + 10 }}
                >
                    <strong>{hoverNode.kind.toUpperCase()}</strong>: {hoverNode.label}
                    {hoverNode.text && <div style={{ fontSize: '9px', opacity: 0.7, marginTop: 4 }}>{hoverNode.text}</div>}
                </div>
            )}
        </div>
    );
};

export default SentenceGraph;
