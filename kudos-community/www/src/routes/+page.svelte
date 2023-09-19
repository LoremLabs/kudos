<script>
	import { onMount } from 'svelte';

	import Meta from '$lib/components/Meta.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Scroller from '$lib/components/Scroller.svelte';
	import { Donut } from '@unovis/ts';

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
{#if index2 >= 0}
	<Nav enableLogin={false} />
{/if}
<div class="flex flex-col justify-start items-center bg-tertiary zh-screen">
	<div class="relative bg-white h-full">
		<div
			class="mx-auto max-w-7xl flex flex-col items-center justify-center lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8"
		>
			<div class="px-6 py-4 lg:col-span-7 lg:px-0 lg:pt-48 xl:col-span-6 bg-white">
				<div class="mx-auto max-w-2xl lg:mx-0 text-lg leading-8 text-gray-600">
					<img src="/svg/kudos-logo-11.svg" alt="Kudos" class="h-11" />

					<div class="hidden sm:mt-32 sm:flex lg:mt-16">
						<div
							class="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-500 ring-1 ring-gray-900/10 hover:ring-gray-900/20"
						>
							Interested in claiming your identity? <a
								href="/claim"
								class="whitespace-nowrap font-semibold text-primary"
								><span class="absolute inset-0" aria-hidden="true" />Claim Id
								<span aria-hidden="true">&rarr;</span></a
							>
						</div>
					</div>
					<h1 class="mt-24 text-4xl font-bold tracking-tight text-gray-900 sm:mt-10 sm:text-6xl">
						Support Everyone Who Helps You
					</h1>
					<p class="mt-6">
						Kudos is an <span
							class="underline p-2"
							style="text-decoration-color:#4E26DE; text-decoration-thickness: 2px;"
							>open algorithm</span
						> to fund the creators you depend on.
					</p>
					<ol class="w-full pt-2 list-decimal leading-loose px-12">
						<li class="list-item py-2">
							<span class="px-2">✍️</span> Each time someone helps you, record their name.
						</li>
						<li class="list-item py-2">
							<span class="px-2">🌈</span> Divide your budget between all the names.
						</li>
						<li class="list-item py-2">
							<span class="px-2">🥳</span> Each person gets their share of your budget.
						</li>
					</ol>

					<div class="mt-10 pb-24 flex items-center gap-x-6">
						<a
							href="/claim"
							class="rounded-full bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
							>Get Started</a
						>
						<a
							href="#learn"
							on:click|preventDefault={scrollIntoView}
							class="text-sm font-semibold leading-6 text-gray-900"
							>Learn more <span class="rotate-45" aria-hidden="true">↓</span></a
						>
					</div>
				</div>
			</div>

			<div class="hidden sm:grid items-center justify-center lg:col-span-5 h-full pt-10">
				<div class="absolute">
					<img
						class="top-0 bg-gray-50 object-left-top object-cover sm:rounded-xl sm:rotate-0 shadow-xl w-96 h-96 z-10 border-8 border-white"
						src="/svg/fairtread-sun.svg"
						alt=""
					/>
					<img
						class="hidden sm:block absolute top-24 bg-gray-50 object-cover sm:rounded-xl sm:rotate-3 shadow-xl w-96 h-96 translate-x-12 border-8 border-white inset-8"
						src="/svg/fairtread-sun.svg"
						alt=""
					/>
				</div>
			</div>
		</div>
	</div>
</div>
<div class="flex sm:hidden items-start justify-center">
	<div class="">
		<img class="object-fill w-full h-96" src="/svg/fairtread-sun.svg" alt="" />
	</div>
</div>

<section
	class="flex flex-col justify-start items-center bg-tertiary zh-screen w-full"
	id="ecosystem"
>
	<div class="w-full h-full max-w-7xl bg-quad mx-auto px-6 lg:px-8">
		<h2 class="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:mt-10 max-w-xl">
			Kudos Ecosystem
		</h2>
		<div class="pb-24 lg:pb-36 divide-y-8">
			<div class="lg:grid lg:grid-cols-12 lg:gap-8 py-12">
				<div class="lg:col-span-5 pl-6">
					<h2 class="text-2xl font-bold leading-10 tracking-tight text-gray-900">Create Kudos</h2>

					<p class="mt-4 text-xs leading-7 text-gray-600">
						Know another one? <a
							href="https://github.com/LoremLabs/kudos/pulls"
							class="font-semibold text-primary hover:text-primary/80"
							target="_blank">Make a PR</a
						>.
					</p>
				</div>
				<div class="mt-10 lg:col-span-7 lg:mt-0">
					<dl class="space-y-10 w-1/2 m-auto">
						<div>
							<dt class="text-base font-semibold leading-7 text-gray-900 pb-4">
								These services help create and fund Kudos from Open Source contributions.
							</dt>
							<dd class="mt-2 text-base leading-7 text-gray-600">
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
				</div>
			</div>
			<div class="lg:grid lg:grid-cols-12 lg:gap-8 py-12">
				<div class="lg:col-span-5 pl-6">
					<h2 class="text-2xl font-bold leading-10 tracking-tight text-gray-900">
						Claim Your Identity
					</h2>
					<p class="mt-4 text-xs leading-7 text-gray-600">
						Know another one? <a
							href="https://github.com/LoremLabs/kudos/pulls"
							class="font-semibold text-primary hover:text-primary/80"
							target="_blank">Make a PR</a
						>.
					</p>
				</div>
				<div class="mt-10 lg:col-span-7 lg:mt-0">
					<dl class="space-y-10 w-1/2 m-auto">
						<div>
							<dt class="text-base font-semibold leading-7 text-gray-900 pb-4">
								Validate your Identity to claim your share of kudos.
							</dt>
							<dd class="mt-2 text-base leading-7 text-gray-600">
								<div
									class="-mx-6 grid grid-cols-1 gap-0.5 overflow-hidden sm:mx-0 rounded-full shadow-lg md:grid-cols-1 border border-black group"
								>
									<button
										class="bg-white p-8 sm:p-10 group-hover:bg-primary/10 cursor-pointer"
										on:click={() => {
											window.open('https://www.ident.agency/?utm_source=kudos', '_blank');
										}}
									>
										<img
											src="/svg/ia-logo-05.svg"
											alt="Ident.Agency"
											class="max-h-12 w-full object-contain"
										/>
									</button>
								</div>
							</dd>
						</div>
					</dl>
				</div>
			</div>
			<div class="lg:grid lg:grid-cols-12 lg:gap-8 py-12">
				<div class="lg:col-span-5 pl-6">
					<h2 class="text-2xl font-bold leading-10 tracking-tight text-gray-900">Kudos Wallets</h2>
					<p class="mt-4 text-xs leading-7 text-gray-600">
						Know another one? <a
							href="https://github.com/LoremLabs/kudos/pulls"
							class="font-semibold text-primary hover:text-primary/80"
							target="_blank">Make a PR</a
						>.
					</p>
				</div>
				<div class="mt-10 lg:col-span-7 lg:mt-0">
					<dl class="space-y-10 w-1/2 m-auto">
						<div>
							<dt class="text-base font-semibold leading-7 text-gray-900 pb-4">
								These wallets can be used to manage Kudos.
							</dt>
							<dd class="mt-2 text-base leading-7 text-gray-600">
								<div
									class="-mx-6 grid grid-cols-1 gap-0.5 overflow-hidden sm:mx-0 rounded-full shadow-lg md:grid-cols-1 border border-black group"
								>
									<button
										class="bg-white p-8 sm:p-10 group-hover:bg-primary/10 cursor-pointer"
										on:click={() => {
											window.open('https://www.setler.app/?utm_source=kudos', '_blank');
										}}
									>
										<img
											src="/svg/setler-logo-01.svg"
											alt="Setler"
											class="max-h-12 w-full object-contain"
										/>
									</button>
								</div>
							</dd>
						</div>
					</dl>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="isolate overflow-hidden" id="learn">
	<div class="flex flex-col justify-start items-center bg-white sm:bg-tertiary overflow-hidden">
		<div class="mx-auto max-w-7xl w-full">
			<div class="w-full bg-white h-full py-12">
				<h2 class="mt-6 px-8 text-4xl font-bold tracking-tight text-gray-900 sm:mt-10 max-w-xl">
					Motivation
				</h2>
			</div>
		</div>
	</div>

	<Scroller
		flipFocus={false}
		top={0.0}
		bottom={1}
		bind:index={index2}
		bind:offset={offset2}
		bind:progress={progress2}
		parallax={false}
	>
		<div
			slot="background"
			class="flex flex-col justify-start items-center bg-white sm:bg-tertiary h-screen overflow-hidden"
		>
			<div class="mx-auto max-w-7xl w-full">
				<div class="w-full bg-white h-full py-12">
					<svg {viewBox} class="w-full h-screen">
						<image href="/svg/example-kudos-1.svg" transform={rotation} />
					</svg>
				</div>
			</div>
		</div>

		<div slot="foreground">
			<section class="h-screen w-full bg-transparent flex flex-row items-center justify-center">
				<div class="mx-auto max-w-7xl w-full">
					<div class="flex flex-col items-center justify-center h-full">
						<div class="m-autoz bg-white text-black">
							<h1 class="p-2 text-4xl font-bold tracking-tight sm:text-6xl text-center">
								An average GitHub repository uses contributions from 12,500 people!
							</h1>
						</div>
					</div>
				</div>
			</section>
			<section class="h-screen w-full bg-transparent flex flex-row items-center justify-center">
				<div class="mx-auto max-w-7xl w-full">
					<div class="flex flex-col items-center justify-center h-full">
						<div class="m-autoz bg-white text-black">
							<h1 class="p-2 text-4xl font-bold tracking-tight sm:text-6xl text-center">
								But only 1% of those people get paid.
							</h1>
						</div>
					</div>
				</div>
			</section>
			<section class="h-screen w-full bg-transparent flex flex-row items-center justify-center">
				<div class="mx-auto max-w-7xl w-full">
					<div class="flex flex-col items-center justify-center h-full">
						<div class="m-autoz bg-white text-black">
							<h1 class="p-2 text-4xl font-bold tracking-tight sm:text-6xl text-center">
								With Kudos we can reward each contribution.
							</h1>
						</div>
					</div>
				</div>
			</section>
			<section class="h-screen w-full bg-transparent flex flex-row items-center justify-center">
				<div class="mx-auto max-w-7xl w-full">
					<div class="flex flex-col items-center justify-center h-full">
						<div class="mx-12 bg-white text-black">
							<h1 class="p-2 text-4xl font-bold tracking-tight sm:text-6xl text-center">
								And we can do it without changing the way we work.
							</h1>
						</div>
					</div>
				</div>
			</section>
			<section class="h-screen w-full bg-transparent flex flex-row items-center justify-center">
				<div class="mx-auto max-w-7xl w-full">
					<div class="flex flex-col items-center justify-center h-full">
						<div class="mx-12 bg-white text-black">
							<h1 class="p-2 text-4xl font-bold tracking-tight sm:text-6xl text-center">
								This visualization is all the contributors of a GitHub repo, but Kudos can be
								applied to other domains like web content.
							</h1>
						</div>
					</div>
				</div>
			</section>
		</div>
	</Scroller>
</section>
<section
	class="isolate flex flex-col justify-center items-center bg-tertiary overflow-hidden h-screen"
>
	<div class="max-w-7xl w-full h-full bg-primary flex flex-col justify-center items-center">
		<div class="px-6 py-24 sm:px-6 sm:py-32 lg:px-8 m-auto">
			<div class="m-auto max-w-2xl text-center">
				<h2 class="text-3xl font-bold tracking-tight leading-relaxed text-white sm:text-4xl">
					Get more from your digital life.<br />Give Kudos.
				</h2>
				<div class="mt-10 flex items-center justify-center gap-x-6">
					<a
						href="/create"
						class="rounded-full bg-white px-3.5 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						>Get started</a
					>
					<a href="/claim" class="text-sm font-semibold leading-6 text-white"
						>Claim my id <span aria-hidden="true">→</span></a
					>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="isolate flex flex-col justify-center items-center bg-tertiary overflow-hidden">
	<div class="max-w-7xl w-full h-full bg-white flex flex-col justify-center items-center">
		<div class="bg-quad w-full py-24">
			<div class="mx-auto max-w-7xl px-6 lg:px-8">
				<h2 class="text-center text-lg font-semibold leading-8 text-gray-900">
					Kudos was made possible with the support of the following organizations.
				</h2>
				<div
					class="mx-auto mt-10 grid max-w-lg grid-cols-2 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-2 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-2"
				>
					<img
						class="col-span-2 max-h-24 w-full object-contain lg:col-span-1"
						src="/svg/mozilla-foundation-logo-01.svg"
						alt="Mozilla Foundation"
					/>
					<img
						class="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
						src="/svg/xrpl-ledger-logo-01.svg"
						alt="XRPL Ledger"
					/>
				</div>
			</div>
		</div>
	</div>
</section>

<section
	class="isolate flex flex-col justify-center items-center bg-tertiary h-screen overflow-hidden"
>
	<div class="max-w-7xl w-full h-full bg-white flex flex-col justify-center items-center">
		<div class="m-auto max-w-2xl px-4 py-12">
			<div class="px-6 py-24 bg-secondary rounded-xl">
				<h2
					class="mx-auto text-center text-3xl font-semibold tracking-tight text-black md:text-5xl max-w-md"
				>
					Join our List
				</h2>
				<p class="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-black">
					Stay up to date on the latest Kudos news.
				</p>
				<form class="mx-auto mt-10 flex max-w-md gap-x-4">
					<label for="email-address" class="sr-only">Email address</label>
					<HoneyPot bind:value={honeypot} />
					<input
						type="email"
						name="email-address"
						id="email-address"
						autocomplete="email"
						bind:value={email}
						required
						class="min-w-0 flex-auto rounded-full border-0 border-gray-300 bg-white px-5 py-2.5 text-black shadow-sm ring-1 ring-inset ring-white/0 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
						placeholder="Enter your email"
					/>
					<button
						on:click|preventDefault={handleNewEmail}
						class="flex-none rounded-full bg-black px-5 pt-2.5 pb-2 text-sm font-action font-medium text-white shadow-sm hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white -ml-16"
						><span class="m-auto flex justify-center items-center"> Notify me </span></button
					>
				</form>
			</div>
		</div>
	</div>
</section>

<Footer />
