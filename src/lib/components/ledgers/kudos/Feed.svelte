<script lang="ts">
  import EventRow from '$lib/components/EventRow.svelte';

  export let feedHeight = 0;

  let ledgerParts = [
    {
      _ts: Date.now().toLocaleString(),
      _id: '5f9f1b5b0b9b9b0001b0b1b1',
      _type: 'kudos',
      _source: 'kudos',
      _sourceId: '5f9f1b5b0b9b9b0001b0b1b1',
      _sourceType: 'kudos',
      _sourceName: 'Kudos',
    },
    {
      _ts: Date.now().toLocaleString(),
      _id: '5f9f1b5b0b9b9b0001b0b1b1',
      _type: 'kudos3',
      _source: 'kudos',
      _sourceId: '5f9f1b5b0b9b9b0001b0b1b1',
      _sourceType: 'kudos',
      _sourceName: 'Kudos',
    },
    {
      _ts: new Date('2021-03-03').toLocaleString(),
      _id: '5f9f1b5b0b9b9b0001b0b1b1',
      _type: 'kudos2',
      _source: 'kudos',
      _sourceId: '5f9f1b5b0b9b9b0001b0b1b1',
      _sourceType: 'kudos',
      _sourceName: 'Kudos',
    },
  ];
</script>

<div
  class="w-full overflow-y-scroll"
  style={`height: 100%; max-height: ${feedHeight}px !important; min-height: ${feedHeight}`}
>
  <ul class="max-h-screen overflow-y-auto rounded-lg">
    {#each ledgerParts as ev, i}
      <li class="py pr-4" class:bg-slate-200={i % 2 == 0}>
        <EventRow
          {ev}
          allowDetails={true}
          isLast={i == ledgerParts.length - 1}
        />
      </li>
    {/each}
  </ul>
</div>
