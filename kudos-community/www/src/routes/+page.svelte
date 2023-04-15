<script>
	import { onMount } from 'svelte';

	import Meta from '$lib/components/Meta.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	//    import { page } from '$app/stores';
	import { addToast } from '$lib/stores/toasts';

	import HoneyPot from '$lib/components/HoneyPot.svelte';
	// import Icon from '$lib/components/Icon.svelte';

	let email = '';
	let honeypot = '';

	// see if the query params contained a favicon
	let faviconItem;
	let favicon = '/favicon';

	const MAX_FAVICONS = 29;

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
</script>

<Meta />

<div class="flex flex-col justify-center items-center bg-sept min-h-[80vh] lg:min-h-screen pt-12">
	<div class="mx-auto max-w-7xl lg:grid lg:grid-cols-2 lg:gap-x-48 w-full md:px-8 xl:px-0 lg:pb-40">
		<div class="h-full">
			<div class="mx-auto max-w-2x">
				<div class="max-w-lg p-8 sm:p-0 h-full bg-red-100z m-auto">
					<h1 class="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
						A new way to reward creators and coders
					</h1>
					<p class="mt-6 text-lg leading-8 text-gray-600">
						Kudos is an open protocol that recognizes those that help you. Take the kudos concept
						for your own projects or build on top of our community code.
					</p>
					<div class="mt-10 grid md:flex items-center justify-start gap-6 h-full">
						<a
							href="https://github.com/LoremLabs/kudos/raw/main/rfcs/000-kudos-sketch/000-kudos-sketch.pdf"
							class="text-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
							>Read the Overview</a
						>
						<a
							href="https://github.com/orgs/LoremLabs/projects/3/views/3"
							target="_blank"
							class="text-sm font-semibold leading-6 text-gray-900"
							>View our Roadmap on GitHub <span aria-hidden="true">→</span></a
						>
					</div>
				</div>
			</div>
		</div>
		<div class="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 relative isolate">
			<div
				class="w-[70%] ml-24 -mr-24 h-36 z-0 hidden lg:block absolute"
				style="background-image: url(/patterns/kudos-06.svg)"
			/>
			<div
				class="w-48 h-48 xl:w-96 xl:h-48 z-0 -ml-4 md:-ml-12 xl:-ml-24 absolute -bottom-4 md:-bottom-12 xl:-bottom-16 rotate-180 hidden lg:block"
				style="background-image: url(/patterns/kudos-06.svg)"
			/>
			<img
				src="/imgs/kudos-code-01.png"
				alt="Kudos Code Example"
				class="overflow-hidden z-10 absolute md:mt-16 max-h-96 h-full shadow-2xl rounded-2xl"
			/>
		</div>
	</div>
	<div
		class="-mt-12 mb-12 lg:hidden relative h-96 overflow-hidden mx-8 flex flex-col items-end justify-end isolate"
	>
		<div class="h-36 w-48" style="background-image: url(/patterns/kudos-06.svg)" />
		<div class="overflow-hidden max-h-[40vh] h-full z-10 rounded-2xl">
			<img
				src="/imgs/kudos-code-01.png"
				alt="Kudos Code Example"
				class="overflow-hidden mx-4 rounded-2xl"
			/>
		</div>
		<div class="w-full flex flex-row items-start -ml-4 -mt-8">
			<div class="h-36 w-48" style="background-image: url(/patterns/kudos-06.svg)" />
		</div>
	</div>
</div>
<div class="relative isolate bg-repeat" style="background-image: url(/patterns/kudos-05.svg)">
	<div class="mx-auto max-w-7xl">
		<div class="relative isolate overflow-hidden px-6 py-24 sm:px-24 xl:py-32">
			<h2
				class="mx-auto text-center text-3xl font-bold tracking-tight text-gray-800 md:text-5xl max-w-md"
			>
				Be the first to know about our progress
			</h2>
			<p class="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-gray-400">
				Join our low volume email list.
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
					class="min-w-0 flex-auto rounded-md border-1 border-gray-300 bg-white px-5 py-2.5 text-black shadow-sm ring-1 ring-inset ring-white/0 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
					placeholder="Enter your email"
				/>
				<button
					on:click|preventDefault={handleNewEmail}
					class="flex-none rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					><span class="m-auto flex justify-center items-center"> Notify me </span></button
				>
			</form>
		</div>
	</div>
</div>

<Footer />

<Nav show={false} />
