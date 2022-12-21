<script>
  import {
    sankey as d3sankey,
    // SankeyGraph,
    // SankeyLink,
    // SankeyNode,
    sankeyLeft,
    sankeyRight,
    sankeyCenter,
    sankeyJustify,
  } from 'd3-sankey';
  import { linkHorizontal } from 'd3-shape';
  import { scaleSequential } from 'd3-scale';
  import { interpolateCool } from 'd3-scale-chromatic';
  import { extent as d3Extent } from 'd3-array';

  import Group from '$lib/components/Group.svelte';

  export let width;
  export let height;
  export let margin = {
    top: 0,
    left: 0,
    right: 200,
    bottom: 0,
  };
  export let graph;
  export let size = undefined;
  export let nodeId = undefined;
  export let nodeAlign = undefined;
  export let nodeWidth = undefined;
  export let nodePadding = undefined;
  export let nodeSort = undefined;
  export let extent = undefined;
  export let iterations = undefined;
  export let highlightLinkIndexes = [];

  let activeId;

  const color = scaleSequential(interpolateCool);
  let nodes, links;
  $: {
    const sankey = d3sankey();
    if (size) sankey.size(size);
    if (nodeId) sankey.nodeId(nodeId);
    if (nodeAlign) {
      if (nodeAlign === 'left') {
        sankey.nodeAlign(sankeyLeft);
      } else if (nodeAlign === 'right') {
        sankey.nodeAlign(sankeyRight);
      } else if (nodeAlign === 'center') {
        sankey.nodeAlign(sankeyCenter);
      } else if (nodeAlign === 'justify') {
        sankey.nodeAlign(sankeyJustify);
      } else {
        sankey.nodeAlign(nodeAlign);
      }
    }
    if (nodeWidth) sankey.nodeWidth(nodeWidth);
    if (nodePadding) sankey.nodePadding(nodePadding);
    if (nodeSort) sankey.nodeSort(nodeSort);
    if (extent) sankey.extent(extent);
    if (iterations) sankey.iterations(iterations);
    const data = sankey(graph);
    nodes = data.nodes;
    links = data.links;
    // Set color domain after sankey() has set depth
    color.domain(d3Extent(nodes, (d) => d.depth));
  }
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    maximumFractionDigits: 5, // (causes 2500.99 to be printed as $2,501)
  });

  const path = linkHorizontal()
    // @ts-ignore
    .source((d) => [d.source.x1, d.y0])
    // @ts-ignore
    .target((d) => [d.target.x0, d.y1]);
</script>

<svg
  viewBox={`0 0 ${width + margin.left + margin.right} ${
    height + margin.top + margin.bottom
  }`}
>
  <g>
    <g>
      {#each links as link, i (`link-${i}`)}
        <path
          key={`link-${i}`}
          d={path(link) || undefined}
          stroke={highlightLinkIndexes.includes(i) ? 'red' : 'black'}
          stroke-width={Math.max(1, link.width)}
          opacity={highlightLinkIndexes.includes(i) ? 0.5 : 0.1}
          fill="none"
          on:mouseover={(e) => {
            highlightLinkIndexes = [i];
          }}
          on:mouseout={(e) => {
            highlightLinkIndexes = [i];
          }}
        />
      {/each}
    </g>

    {#each nodes as node, i (`node-${i}`)}
      <Group top={node.y0} left={node.x0}>
        <rect
          id={`rect-${i}`}
          width={node.x1 - node.x0}
          height={node.y1 - node.y0}
          fill={color(node.depth)}
          opacity={0.75}
          stroke="white"
          stroke-width={2}
          on:mouseover={(e) => {
            activeId = i;
            highlightLinkIndexes = [
              ...node.sourceLinks.map((l) => l.index),
              ...node.targetLinks.map((l) => l.index),
            ];
            console.log({ highlightLinkIndexes });
          }}
          on:mouseout={(e) => {
            // activeId = null;
            // highlightLinkIndexes = [];
          }}
        />

        <text
          x={30}
          y={(node.y1 - node.y0) / 2}
          dy={5}
          style="font: 10px sans-serif"
          _verticalAnchor="middle"
        >
          {#if activeId === i}
            {formatter.format(node.value / 100)}
          {:else}
            {node.name}
          {/if}
        </text>
      </Group>
    {/each}
  </g>
</svg>
