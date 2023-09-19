<script>
	import { onMount } from 'svelte';

	import Meta from '$lib/components/Meta.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Scroller from '$lib/components/Scroller.svelte';
	import { typewriter } from '$lib/utils/typewriter';
	import { VisSingleContainer, VisDonut, VisTooltip } from '@unovis/svelte';
	import { Donut } from '@unovis/ts';
	import Pill from '$lib/components/Pill.svelte';

	import { browser } from '$app/environment';
	import { addToast } from '$lib/stores/toasts';

	import HoneyPot from '$lib/components/HoneyPot.svelte';
	// import Icon from '$lib/components/Icon.svelte';

	let email = '';
	let honeypot = '';

	// see if the query params contained a favicon
	let faviconItem;
	let favicon = '/favicon';

	const MAX_FAVICONS = 29;

	let kudosData = [];
	let kudosValue = (itemCount) => {
		return itemCount;
	};
	let triggers = {
		[Donut.selectors.segment]: (d) => {
			return `${kudosValue(d.data)} !`;
		}
	};
	let graphLabel = '';
	let subGraphLabel = '';

	onMount(() => {
		faviconItem = parseInt(new URLSearchParams(window.location.search).get('favicon'), 10);

		// add one
		faviconItem = faviconItem ? faviconItem + 1 : 1;

		// if we're over MAX_FAVICONS, loop back to 1
		faviconItem = faviconItem > MAX_FAVICONS ? 1 : faviconItem;
	});

	const handleNewEmail = async () => {
		let subResult;
		let subData;
		try {
			subResult = await fetch(`/api/v1/newsletter/announce`, {
				method: 'POST',
				referrerPolicy: 'origin-when-cross-origin',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ email, hp: honeypot })
			});
			subData = await subResult.json();
			console.log({ subData });
		} catch (e) {
			console.log('error', e);
			addToast({ msg: `Error: ${e?.message || 'not valid'}`, type: 'alert', duration: 5000 });
			return false;
		}

		if (!subResult.ok) {
			console.log('error', subData);
			addToast({ msg: `Error: ${subData?.message || 'not valid'}`, type: 'alert', duration: 5000 });
		} else {
			addToast({ msg: `Ok, subscribed.`, type: 'success', duration: 5000 });
			email = '';
		}

		return false;
	};

	let index = 0;
	let offset = 0;
	let progress = 0;

	let index2 = 0;
	let offset2 = 0;
	let progress2 = 0;

	function updateViewBox(off) {
		// const x = Math.cos(off * 2 * Math.PI) * 150 + 10;
		// const y = Math.cos(off * 2 * Math.PI) * 150 + 10;

		const x = 0;
		const y = 0;

		// zoom out as offset approaches 1
		// const zoom = 300 + (1 - off) * 300;

		const zoom = 130;

		const viewBox = `${x} ${y} ${zoom} ${zoom}`;
		return viewBox;
	}

	function updateRotation(off) {
		const rotation = `rotate(${parseInt(off * 360, 10)} 150 150)`;
		return rotation;
	}

	function scrollIntoView({ target }) {
		const el = document.querySelector(target.getAttribute('href'));
		if (!el) return;
		el.scrollIntoView({
			behavior: 'smooth'
		});
	}

	let viewBox = `0 0 150 150`;
	let rotation = `rotate(0 150 150)`;

	$: {
		viewBox = updateViewBox(offset2); // `${parseInt(offset * 400)} ${parseInt(offset * 10)} ${100 - parseInt(offset * 100,10)} ${100 - parseInt(offset * 100,10)}`;
		rotation = updateRotation(offset2);
	}
</script>

<Meta />
<Nav enableLogin={false} autoHide={false} />
<section
	class="flex flex-col justify-start items-center bg-tertiary min-h-screen w-full"
	id="ecosystem"
>
	<div class="w-full max-w-7xl bg-white mx-auto px-6 lg:px-8 h-screen">
		<dl class="space-y-10 w-5/6 sm:w-1/2 m-8 sm:m-auto">
			<h2 class="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:my-10 max-w-xl">
				Create Kudos
			</h2>
			<div>
				<dt class="text-base font-semibold leading-7 text-gray-900 pb-4">
					Kudos is a system for rewarding people for their contributions using existing identities
					such as your email address.
				</dt>
				<dt class="text-base font-semibold leading-7 text-gray-900 pb-4">
					Kudos is a like a journal entry in accounting. It is a record of a transaction. In this
					case, the transaction represents a contribution to a project, a webpage, a codebase, or
					anything else that adds value in your life.
				</dt>
				<dt class="text-base font-semibold leading-7 text-gray-900 pb-4">
					Kudos works best when it's automatic and effortless. The following software helps you
					create Kudos from your existing activities and is a good place to start.
				</dt>

				<dd class="mt-12 text-base leading-7 text-gray-600">
					<div
						class="-mx-6 grid grid-cols-1 gap-0.5 overflow-hidden sm:mx-0 rounded-full shadow-lg md:grid-cols-1 border border-black group"
					>
						<button
							class="bg-white p-8 sm:p-10 group-hover:bg-primary/10 cursor-pointer"
							on:click={() => {
								window.open('https://www.semicolons.com/?utm_source=kudos', '_blank');
							}}
						>
							<img
								class="max-h-12 w-full object-contain"
								src="/svg/semicolons-logo-03.svg"
								alt="Semicolons"
							/>
						</button>
					</div>
				</dd>
			</div>
		</dl>

		<div
			class="mt-24 relative rounded-full px-3 py-1 text-sm leading-6 text-gray-500 ring-1 ring-gray-900/10 hover:ring-gray-900/20 w-60"
		>
			What is Kudos? <a href="/" class="whitespace-nowrap font-semibold text-primary"
				><span class="absolute inset-0" aria-hidden="true" />Learn More
				<span aria-hidden="true">&rarr;</span></a
			>
		</div>
	</div>
</section>

<Footer />
