<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let top = 0;
  export let bottom = 0;
  export let left = 0;
  export let right = 0;

  export let steps = 100;
  export let threshold = 100;
  export let inView = () => {};
  export let outView = () => {};

  let thresholdMet = false;
  let element;
  let percent;
  let observer;
  let unobserve = () => {};

  let intersectionObserverSupport = false;

  function intersectPercent(entries) {
    let initialThreshold = thresholdMet;
    entries.forEach((entry) => {
      percent = Math.round(Math.ceil(entry.intersectionRatio * 100));
    });

    // call fn when we change visibility
    if (!initialThreshold && percent >= threshold) {
      thresholdMet = true;
      inView(percent);
    } else if (percent < threshold) {
      thresholdMet = false;
      outView(percent);
    }
  }

  function stepsToThreshold(steps) {
    return [...Array(steps).keys()].map((n) => n / steps);
  }

  onMount(() => {
    if (!browser) {
      return;
    }

    intersectionObserverSupport =
      'IntersectionObserver' in window &&
      'IntersectionObserverEntry' in window &&
      'intersectionRatio' in window.IntersectionObserverEntry.prototype;

    const options = {
      rootMargin: `${top}px ${right}px ${bottom}px ${left}px`,
      threshold: stepsToThreshold(steps),
    };

    if (intersectionObserverSupport) {
      observer = new IntersectionObserver(intersectPercent, options);
      if (element) {
        observer.observe(element);
        unobserve = () => observer.unobserve(element);
      }
    }

    return unobserve;
  });
</script>

<div bind:this={element}>
  <slot {percent} {unobserve} {intersectionObserverSupport} />
</div>
