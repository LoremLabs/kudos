<script>
	// import { onMount } from 'svelte';

	import Meta from '$lib/components/Meta.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	//    import { page } from '$app/stores';
	import { addToast } from '$lib/stores/toasts';

	import HoneyPot from '$lib/components/HoneyPot.svelte';
	// import Icon from '$lib/components/Icon.svelte';

	let email = '';
	let honeypot = '';

	// onMount(() => {
	// });

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
</script>

<Meta />

<div class="flex flex-col justify-center items-center bg-sept min-h-[80vh] lg:min-h-screen pt-12">
	<div class="mx-auto max-w-7xl lg:grid lg:grid-cols-2 lg:gap-x-48 w-full md:px-8 xl:px-0 lg:pb-40">
		<div class="h-full">
			<div class="mx-auto max-w-2x">
				<div class="max-w-lg p-8 sm:p-0 h-full m-auto">
					<h1
						class="mt-10 text-4xl font-logo font-semibold tracking-widest text-gray-900 sm:text-7xl"
					>
						Identity<span class="text-black">.</span> <span class="text-logo">Kudos</span><span
							class="text-black">.</span
						>
						Wallet<span class="text-black">.</span>
					</h1>
					<p class="mt-6 text-lg leading-8 text-gray-600">
						The identity wallet with <a
							class="underline"
							target="_blank"
							href="https://www.kudos.community/?utm_source=setler"
						>
							Kudos</a
						> support.
					</p>
					<div class="mt-10 grid md:flex items-center justify-start gap-6 h-full">
						<a
							href="https://github.com/loremlabs/kudos"
							target="_blank"
							class="text-center rounded-full bg-purple-900 px-5 pt-2.5 pb-2 text-sm font-action font-medium text-white shadow-sm hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
							>Download</a
						>
						<a href="/docs" class="text-sm font-semibold leading-6 text-gray-900"
							>Setler is a new word <span aria-hidden="true">→</span></a
						>
					</div>
				</div>
			</div>
		</div>
		<div class="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 relative isolate">
			<div class="hidden lg:block mask w-full aspect-[1/1]">
				<picture>
					<source type="image/webp" srcset="/imgs/joao-guimaraes-9b4jtcBEP4A-unsplash.webp" />
					<img
						class="w-full h-full object-cover"
						style="filter: grayscale(10);"
						alt=""
						src="/imgs/joao-guimaraes-9b4jtcBEP4A-unsplash.jpg"
					/>
				</picture>
			</div>
			<style>
				.mask {
					clip-path: url(#setler-mask-01);
				}
			</style>
			<svg width="0" height="0" fill="none" xmlns="http://www.w3.org/2000/svg">
				<clipPath id="setler-mask-01" clipPathUnits="objectBoundingBox">
					<path
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M0.694908 0.635C0.765557 0.738904 0.806688 0.865203 0.806688 1H0.536688C0.536688 0.793109 0.377127 0.635 0.191911 0.635H0V0.365H0.191911C0.377127 0.365 0.536687 0.206891 0.536687 0H0.806687C0.806687 0.134797 0.765557 0.261096 0.694908 0.365H0.951557V0.635H0.694908Z"
						fill="#EFBE56"
					/>
				</clipPath>
			</svg>
		</div>
	</div>
</div>
<div class="lg:p-3">
	<div
		class="relative isolate bg-repeat bg-quad/5 bg-opacity-10"
		style="background-image: url(/patterns/setler-pattern-01.svg)"
	>
		<div class="mx-auto max-w-7xl">
			<div class="px-2 py-24 sm:px-24 xl:py-32 flex flex-row items-center justify-center">
				<div
					class="bg-white rounded md:rounded-lg p-4 lg:p-16 shadow md:shadow-2xl border-gray-300 border-2 md:border-4 max-w-xs md:max-w-lg"
				>
					<h2
						class="mx-auto text-center text-2xl font-semibold tracking-tight text-gray-800 md:text-4xl md:max-w-md"
					>
						Be the first to know the latest
					</h2>
					<p class="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-gray-400">
						Join our low volume email list.
					</p>
					<form class="mx-auto mt-10 flex flex-col md:flex-row md:max-w-md gap-x-4">
						<label for="email-address" class="sr-only">Email address</label>
						<HoneyPot bind:value={honeypot} />
						<input
							type="email"
							name="email-address"
							id="email-address"
							autocomplete="email"
							bind:value={email}
							required
							class="min-w-0 flex-auto rounded-md border-1 focus:border-0 border-gray-300 bg-white px-5 py-2.5 text-black shadow-sm ring-1 ring-inset ring-white/0 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
							placeholder="Enter your email"
						/>
						<button
							on:click|preventDefault={handleNewEmail}
							class="flex-none rounded-full bg-primary px-5 pt-2.5 pb-2 mt-4 text-sm font-action font-medium text-white shadow-sm hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-200"
							><span class="m-auto flex justify-center items-center"> Notify me </span></button
						>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>

<Footer />

<Nav show={false} />
