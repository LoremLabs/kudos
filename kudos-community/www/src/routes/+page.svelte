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
<Nav />

<div class="flex flex-col justify-start items-center bg-tertiary h-[100vh]">
	<div class="relative bg-white">
		<div class="mx-auto max-w-7xl lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8">
			<div class="px-6 pb-24 pt-10 sm:pb-32 lg:col-span-7 lg:px-0 lg:pb-56 lg:pt-48 xl:col-span-6">
				<div class="mx-auto max-w-2xl lg:mx-0">
					<img src="/svg/kudos-logo-11.svg" alt="Kudos" class="h-11" />

					<div class="hidden sm:mt-32 sm:flex lg:mt-16">
						<div
							class="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-500 ring-1 ring-gray-900/10 hover:ring-gray-900/20"
						>
							Anim aute id magna aliqua ad ad non deserunt sunt. <a
								href="#"
								class="whitespace-nowrap font-semibold text-indigo-600"
								><span class="absolute inset-0" aria-hidden="true" />Read more
								<span aria-hidden="true">&rarr;</span></a
							>
						</div>
					</div>
					<h1 class="mt-24 text-4xl font-bold tracking-tight text-gray-900 sm:mt-10 sm:text-6xl">
						Enabling the Compensation of Value
					</h1>
					<p class="mt-6 text-lg leading-8 text-gray-600">
						No matter how small. Sending Pennies for Thoughts.
					</p>
					<div class="mt-10 flex items-center gap-x-6">
						<a
							href="#"
							class="rounded-full bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
							>Get started</a
						>
						<a href="#" class="text-sm font-semibold leading-6 text-gray-900"
							>Learn more <span aria-hidden="true">→</span></a
						>
					</div>
				</div>
			</div>
			<div class="flex flex-col items-center justify-center lg:col-span-5 lg:-mr-8 h-full">
				<div class="absolute">
					<img
						class="top-0 bg-gray-50 object-left-top object-cover sm:rounded-xl sm:rotate-0 shadow-xl w-96 h-96 z-10 border-8 border-white"
						src="/svg/fairtread-sun.svg"
						alt=""
					/>
					<img
						class="absolute top-24 bg-gray-50 object-cover sm:rounded-xl sm:rotate-3 shadow-xl w-96 h-96 translate-x-12 border-8 border-white inset-8"
						src="/svg/fairtread-sun.svg"
						alt=""
					/>
				</div>
			</div>
		</div>
	</div>
</div>
<div class="flex flex-col justify-start items-center bg-tertiary h-[100vh]">
	<div class="m-auto max-w-7xl w-full h-full bg-white">
		<div class="bg-white w-full">
			<div class="m-auto max-w-2xl px-4 py-12">
				<div class="relative  overflow-hidden px-6 py-24 bg-secondary rounded-xl">
					<h2
						class="mx-auto text-center text-3xl font-semibold tracking-tight text-black md:text-5xl max-w-md"
					>
						Request an Invite
					</h2>
					<p class="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-black">
						We're currently in private beta. Sign up to be notified when we launch.
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
	</div>
</div>

<Footer />
