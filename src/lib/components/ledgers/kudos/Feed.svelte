<script lang="ts">
  import EventRow from '$lib/components/EventRow.svelte';
  import JsPretty from '$lib/components/JSPretty.svelte';

  import { afterUpdate, beforeUpdate } from 'svelte';
  import '$styles/code.css';

  export let debugThis = {};
  export let feedHeight = 0;
  let element;

  const fmt = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let isScrollingTimer: string | number | NodeJS.Timeout | null | undefined =
    null;
  let recentScrolls = 0;
  let userScrolled = false;

  const handleScroll = (element: {
    target: { scrollTop: any; clientHeight: any; scrollHeight: number };
  }) => {
    // check to see if the user scrolled to the bottom
    if (
      element.target.scrollTop + element.target.clientHeight >=
      element.target.scrollHeight
    ) {
      userScrolled = false;
    }

    if (isScrollingTimer) {
      clearTimeout(isScrollingTimer);
    }

    // Set a timeout to run after scrolling ends
    isScrollingTimer = setTimeout(function () {
      // Run the callback
      recentScrolls = 0;
    }, 66);

    if (recentScrolls > 20) {
      userScrolled = true;
    }

    recentScrolls++;
  };

  export let feed = [];
  const scrollToBottom = async (node, force) => {
    if (userScrolled && !force) {
      // don't scroll if the user scrolled
      return;
    }
    node.scroll({ top: node.scrollHeight + 50, behavior: 'smooth' });
  };

  beforeUpdate(() => {
    if (feed.length) {
      // sort feed
      feed = feed.sort((a, b) => {
        return new Date(a._ts).getTime() - new Date(b._ts).getTime();
      });
    }
  });

  afterUpdate(() => {
    if (feed.length) {
      scrollToBottom(element);
    }
  });

  // feed = feed.sort((a, b) => {
  //   return new Date(a._ts).getTime() - new Date(b._ts).getTime();
  // });

  $: if (feed && feed.length && element) {
    scrollToBottom(element);
  }

  function handleKeypress(ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      scrollToBottom(element, true);
      ev.preventDefault;
    }
  }
</script>

<svelte:body on:keydown={handleKeypress} />

<div
  class="w-full overflow-y-auto"
  style={`height: 100%; max-height: ${feedHeight}px !important; min-height: ${feedHeight}`}
  id="scroll-container"
  bind:this={element}
  on:scroll={handleScroll}
>
  <ul class="max-h-screen rounded-lg">
    {#if Object.keys(debugThis).length > 0}
      <li>
        <div class="text-xs">
          <pre><JsPretty obj={debugThis} /></pre>
        </div>
      </li>
    {/if}
    {#each feed as ev, i}
      <li class="py pr-4">
        <!-- for each new date, put a header -->
        {#if i == 0 || new Date(feed[i - 1]?._ts).getDate() != new Date(ev._ts).getDate()}
          <div class="relative flex justify-start">
            <span class="mt-8 mb-4 ml-2 px-2 text-sm font-medium text-gray-900"
              >{fmt.format(new Date(ev._ts))}</span
            >
          </div>
        {/if}
        {#if feed[i + 1] && new Date(feed[i + 1]?._ts).getDate() != new Date(ev._ts).getDate()}
          <EventRow {ev} allowDetails={true} isLast={true} />
        {:else}
          <EventRow {ev} allowDetails={true} isLast={i == feed.length - 1} />
        {/if}
      </li>
    {/each}
  </ul>
</div>
