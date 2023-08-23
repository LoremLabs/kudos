<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Banner from '$lib/components/Banner.svelte';
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';

	import md5 from 'md5';

	const gravatar = (em) => {
		if (em) {
			return `https://www.gravatar.com/avatar/${md5(em.toLowerCase())}?d=mp`;
		}
		return '';
	};

	export let show = false;
	export let showBanner = false;
	export let brand = 'Kudos';
	export let enableLogin = true;
	export let autoHide = true;

	let hidden = true;
	let translateY = 0;
	let scrollY = 0;

	$: {
		if (autoHide) {
			hidden = scrollY < 100;
			translateY = scrollY < 100 ? 0 : -20; // Adjust this value as needed
		} else {
			hidden = false;
		}
	}

	const navItems = [
		{
			text: '',
			url: '/',
			screenReader: `${brand} Home`,
			img: '/svg/kudos-logo-10.svg',
			imgAlt: `${brand} Logo`,
			imgClass: 'h-8 mt-3'
		}
	];
</script>

<svelte:window bind:scrollY />

{#if !hidden}
	<nav
		class="text-black sticky transition-transform ease-in-out duration-200 z-30 flex flex-col justify-start items-center bg-tertiary"
		class:top-0={!showBanner}
		class:top-12={showBanner}
		transition:fly={{ y: -100, duration: 250 }}
	>
		<div
			class="mx-auto max-w-7xl flex w-full flex-col overflow-y-auto py-2 pl-4 pr-2 justify-center items-center bg-white"
		>
			{#if show}
				<div
					class="fixed inset-0 z-[-1] h-full w-full bg-black/30"
					on:click={() => (show = !show)}
				/>
			{/if}
			<div class="px-4 flex items-center justify-between w-full max-w-7xl gap-4">
				<ol role="list" class="flex items-center justify-centerspace-x-2">
					{#each navItems as item}
						<li>
							<div class="inline-block">
								<a href={item.url} class="text-white hover:text-gray-100">
									<div class="flex flex-row">
										{item.text}
										{#if item.screenReader}
											<span class="sr-only">{item.screenReader}</span>
										{/if}
										{#if item.img}
											<img src={item.img} alt={item.imgAlt} class={item.imgClass} />
										{/if}
									</div>
								</a>
							</div>
						</li>
					{/each}
				</ol>

				<div class="flex items-center justify-end">
					<a href="https://www.github.com/LoremLabs/kudos" target="_new">
						<span class="sr-only">@LoremLabs Kudos Repo</span>
						<Icon name="brand/github" class="w-8 h-8 textblack" />
					</a>

					{#if enableLogin}
						{#if $page.data?.loggedIn}
							<a href="/dashboard" class="px-3 text-cyan-200 underline">
								<div class="flex">
									<Icon
										name="ellipsis-vertical"
										class="mr-4 h-8 w-8 rounded-full bg-gray-900 text-cyan-50"
									/>
									<img
										class="h-8 w-8 rounded-full"
										src={gravatar($page.data?.email)}
										title={$page.data?.email}
										alt=""
									/>
								</div></a
							>
							<a href="/logout" class="hidden items-center justify-center text-cyan-50 md:flex">
								<Icon name="logout" class="mx-1 h-6 w-6" />
								<span class="sr-only">Log Out</span>
							</a>
						{:else}
							<a href="/login" class="rounded-full bg-black px-3 py-1.5 text-white"> Login </a>
						{/if}
					{/if}
				</div>
			</div>

			{#if show}
				&nbsp;
			{/if}
		</div>
	</nav>
{/if}
{#if showBanner}
	<div class="fixed top-0 z-20 w-full">
		<Banner
			bannerTxt="Check out our Road map"
			linkTxt="Read"
			linkHref="https://github.com/orgs/LoremLabs/projects/3/views/3"
		/>
	</div>
{/if}
