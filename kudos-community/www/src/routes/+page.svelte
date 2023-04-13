<script>
	import { onMount } from 'svelte';

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

<div class="w-full md:p-4 flex flex-col justify-start md:justify-center items-center h-screen z-10">
	<div class="rounded-2xl bg-white">
		<div
			class="relative isolate overflow-hidden bg-gradient-to-b from-cyan-100/20 rounded-2xlz shadow-2xl bg-repeat"
			style="background-image: url(/patterns/kudos-03.svg)"
		>
			<div
				class="mx-auto max-w-7xl pb-24 pt-10 sm:pb-32 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:px-8 lg:pb-40 rounded-2xlz"
			>
				<div class="px-6 lg:px-0 lg:pt-4 h-screen sm:h-full">
					<div class="mx-auto max-w-2x">
						<div class="max-w-lg p-4">
							<img class="h-12 md:h-14" src="/svg/kudos-logo-04.svg" alt="Kudos" />
							<div class="mt-24 sm:mt-32 lg:mt-16">
								<a
									href="https://www.github.com/loremlabs/kudos"
									target="_blank"
									class="inline-flex space-x-6"
								>
									<span
										class="rounded-fullz bg-cyan-600/10 px-3 py-1 text-sm font-semibold leading-6 text-cyan-600 ring-1 ring-inset ring-cyan-600/10"
										>A new way to reward creators and coders</span
									>
									<span
										class="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-600"
									>
										<span>Roadmap to 1.0.0</span>
										<svg
											class="h-5 w-5 text-gray-400"
											viewBox="0 0 20 20"
											fill="currentColor"
											aria-hidden="true"
										>
											<path
												fill-rule="evenodd"
												d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
												clip-rule="evenodd"
											/>
										</svg>
									</span>
								</a>
							</div>
							<h1 class="mt-10 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
								Reward your community
							</h1>
							<p class="mt-6 text-lg leading-8 text-gray-600">
								Kudos is an open protocol that recognizes those that help you. Take the kudos
								concept for your own projects or build on top of our community code.
							</p>
							<div class="mt-10 flex items-center gap-x-6">
								<a
									href="https://github.com/LoremLabs/kudos/raw/main/rfcs/000-kudos-sketch/000-kudos-sketch.pdf"
									class="rounded-full bg-black px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
									>Read the Overview</a
								>
								<a
									href="https://github.com/LoremLabs/kudos"
									target="_blank"
									class="text-sm font-semibold leading-6 text-gray-900"
									>Star on GitHub <span aria-hidden="true">→</span></a
								>
							</div>
						</div>
					</div>
				</div>
				<div class="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen">
					<div
						class="absolute inset-y-0 right-1/2 -z-10 -mr-10 w-[200%] skew-x-[-40deg] bg-white shadow-xl shadow-cyan-600/10 ring-1 ring-cyan-50 md:-mr-20 lg:-mr-36"
						aria-hidden="true"
					/>
					<div class="shadow-lg md:rounded-2xl hidden md:block m-8">
						<div
							class="bg-primary [clip-path:inset(0)] md:[clip-path:inset(0_round_theme(borderRadius.3xl))]"
						>
							<div
								class="absolute -inset-y-px left-1/2 -z-10 ml-10 w-[200%] skew-x-[-30deg] bg-secondary opacity-20 ring-1 ring-inset ring-white md:ml-20 lg:ml-36"
								aria-hidden="true"
							/>
							<div class="relative px-6 pt-8 sm:pt-16 md:pl-16 md:pr-0">
								<div class="mx-auto max-w-2xl md:mx-0 md:max-w-none">
									<div class="w-screen overflow-hidden rounded-tl-2xl bg-secondary">
										<div class="flex bg-gray-800/40 ring-1 ring-white/5">
											<div class="-mb-px flex text-sm font-medium leading-6 text-gray-700">
												<div
													class="border-b border-r border-b-white/20 border-r-white/10 bg-white/5 px-4 py-2 text-gray-500"
												>
													Kudos for Content
												</div>
												<div class="border-r border-gray-600/10 px-4 py-2">Kudos for Code</div>
											</div>
										</div>
										<div class="px-6 pb-14 pt-6">
											<!-- Your code example -->
											<img
												src="/imgs/kudos-code-01.png"
												alt="Kudos Code Example"
												class="overflow-hidden h-96"
											/>
										</div>
									</div>
								</div>
								<div
									class="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10 md:rounded-3xl"
									aria-hidden="true"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div
				class="hidden md:block absolute inset-x-0 bottom-0 -z-10 h-6 bg-gradient-to-t from-white sm:h-12"
			/>
		</div>
	</div>
</div>
<div class="mx-auto mt-16 max-w-7xl pb-24">
	<div
		class="relative isolate overflow-hidden bg-quint px-6 py-24 shadow-2xl sm:rounded-b-2xl sm:px-24 xl:py-32"
	>
		<h2
			class="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-gray-800 sm:text-4xl"
		>
			Be the first to know about our progress
		</h2>
		<p class="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-gray-700">
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
				class="min-w-0 flex-auto rounded-md border-0 bg-white px-3.5 py-2 text-black shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
				placeholder="Enter your email"
			/>
			<button
				on:click|preventDefault={handleNewEmail}
				class="flex-none rounded-full bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
				>Notify me</button
			>
		</form>
		<svg
			viewBox="0 0 1024 1024"
			class="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
			aria-hidden="true"
		>
			<circle
				cx="512"
				cy="512"
				r="512"
				fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
				fill-opacity="0.7"
			/>
			<defs>
				<radialGradient
					id="759c1415-0410-454c-8f7c-9a820de03641"
					cx="0"
					cy="0"
					r="1"
					gradientUnits="userSpaceOnUse"
					gradientTransform="translate(512 512) rotate(90) scale(512)"
				>
					<stop stop-color="#D2E6DA" />
					<stop offset="1" stop-color="#EEEEEE" stop-opacity="0" />
				</radialGradient>
			</defs>
		</svg>
	</div>
</div>

<Footer />
