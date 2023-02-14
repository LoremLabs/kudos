<script lang="ts">
  import EventRow from '$lib/components/EventRow.svelte';
  import JsPretty from '$lib/components/JSPretty.svelte';
  import Visibility from '$lib/components/Visibility.svelte';
  import Icon from '$lib/components/Icon.svelte';

  import { afterUpdate, beforeUpdate } from 'svelte';
  import '$styles/code.css';

  export let debugThis = {};
  export let feedHeight = 0;
  export let loadMore = async (isTop) => {
    console.log('load more', isTop);
  };

  let element;
  let processing = 0;
  let itemsHeight = 0;
  let loadingMore = false;
  const doLoadMore = async (direction) => {
    if (loadingMore) {
      return;
    }
    loadingMore = true;
    processing++;
    // increment processing in half a second
    setTimeout(() => {
      processing++;
    }, 500);
    await loadMore(direction);

    processing--;
    processing--;
    loadingMore = false;
  };

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

  const scrollToTop = async (node, force) => {
    if (userScrolled && !force) {
      // don't scroll if the user scrolled
      return;
    }
    node.scroll({ top: 0, behavior: 'smooth' });
  };

  const isEventFirst = (feed, i) => {
    const ev = feed[i];

    // determine if this is the first in the date range
    if (
      feed[i + 1] &&
      fmt.format(new Date(feed[i + 1]?.ts)) != fmt.format(new Date(ev.ts))
    ) {
      return true;
    }

    if (i === 0) {
      return true;
    }

    if (isEventNewDate(feed, i)) {
      return true;
    }

    return false;
  };

  const isEventLast = (feed, i) => {
    const ev = feed[i];

    if (!feed[i + 1]) {
      // no more
      return true;
    }

    if (
      feed[i + 1] &&
      new Date(feed[i + 1]?.ts).getDate() != new Date(ev.ts).getDate()
    ) {
      // more, but not our date
      return true;
    }

    // not last
    return false;
  };

  const isEventNewDate = (feed, i) => {
    const ev = feed[i];

    if (
      i == 0 ||
      new Date(feed[i - 1]?.ts).getDate() != new Date(ev.ts).getDate()
    ) {
      return true;
    }

    return false;
  };

  beforeUpdate(() => {
    if (feed.length) {
      // sort feed
      feed = feed.sort((a, b) => {
        return new Date(a.ts).getTime() - new Date(b.ts).getTime();
      });
    }
  });

  afterUpdate(() => {
    if (feed.length) {
      if (feedHeight < itemsHeight) {
        scrollToBottom(element);
      } else {
        scrollToTop(element);
      }
    } else {
      scrollToTop(element);
    }
  });

  // feed = feed.sort((a, b) => {
  //   return new Date(a.ts).getTime() - new Date(b.ts).getTime();
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
  <div class="max-h-screen min-h-screen">
    <ul class="rounded-lg" bind:clientHeight={itemsHeight}>
      <li class="my-2 flex w-full flex-row items-center justify-center">
        <Visibility
          threshold={10}
          steps={100}
          inView={() => {
            if (processing <= 0) {
              doLoadMore('head');
            }
          }}
        >
          <div class="h-2 w-full opacity-0" />
          {#if processing > 1}
            <button
              on:click={() => {
                if (processing <= 0) {
                  doLoadMore('head');
                }
              }}
              type="button"
              class="inline-flex items-center rounded-full border border-transparent bg-blue-700 px-2.5 py-1.5 pl-4 pr-4 text-xs font-medium text-white shadow-sm ease-in-out focus:outline-none"
            >
              <span
                aria-label={'processing'}
                class="ml-2 mr-3 animate-spin ease-in-out"
              >
                <Icon name="misc/spinner" class="h-5 w-5 text-gray-50" />
              </span>
            </button>
          {/if}
        </Visibility>
      </li>
      {#if feed.length === 0}
        <li
          class="m-auto m-8 flex overflow-hidden rounded-full bg-slate-50 p-12"
        >
          <Icon
            name="exclaimation-circle"
            class="ml-4 h-10 w-10 text-slate-500"
          />
          <h3 class="p-2">No events found</h3>
        </li>
      {/if}

      {#if Object.keys(debugThis).length > 0}
        <li>
          <div class="text-xs">
            <pre><JsPretty obj={debugThis} /></pre>
          </div>
        </li>
      {/if}
      {#each feed as ev, i}
        {@const isFirst = isEventFirst(feed, i)}
        {@const isLast = isEventLast(feed, i)}
        {@const isNewDate = isEventNewDate(feed, i)}
        {#if ev.ts}
          <li class="py pr-4">
            <!-- for each new date, put a header -->
            {#if isNewDate}
              <div class="relative flex justify-start">
                <span
                  class="mt-8 mb-4 ml-2 px-2 text-sm font-medium text-gray-900"
                  >{fmt.format(new Date(ev.ts))}</span
                >
              </div>
            {/if}
            <EventRow {ev} allowDetails={true} {isLast} {isFirst} />
          </li>
        {/if}
      {/each}
      <li class="my-2 flex w-full flex-row items-center justify-center">
        <Visibility
          threshold={10}
          steps={100}
          inView={() => {
            doLoadMore('tail');
          }}
        >
          <div class="h-8 w-full opacity-0" />
          {#if processing > 1}
            <button
              on:click={() => {
                doLoadMore('tail');
              }}
              type="button"
              class="inline-flex items-center rounded-full border border-transparent bg-blue-700 px-2.5 py-1.5 pl-4 pr-4 text-xs font-medium text-white shadow-sm ease-in-out focus:outline-none"
            >
              <span
                aria-label={'processing'}
                class="ml-2 mr-3 animate-spin ease-in-out"
              >
                <Icon name="misc/spinner" class="h-5 w-5 text-gray-50" />
              </span>
            </button>
          {/if}
        </Visibility>
      </li>
    </ul>
  </div>
</div>
