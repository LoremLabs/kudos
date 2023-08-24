<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Banner from '$lib/components/Banner.svelte';
	import { page } from '$app/stores';
	import md5 from 'md5';

	const gravatar = (em) => {
		if (em) {
			return `https://www.gravatar.com/avatar/${md5(em.toLowerCase())}?d=mp`;
		}
		return '';
	};

	export let show = false;
	export let showBanner = false;
	export let brand = 'Setler';
	export let enableLogin = false;

	const navItems = [
		{
			text: '',
			url: '/',
			screenReader: `${brand} Home`,
			img: '/svg/setler-logo-01.svg',
			imgAlt: `${brand} Logo`,
			imgClass: 'h-12 lg:h-16 mt-3'
		}
	];
</script>

<nav class="m-auto">
	<div
		class="fixed top-0 z-90 flex w-full flex-col overflow-y-auto py-2 pl-4 pr-2 justify-center items-center bg-white"
	>
		{#if show}
			<div class="fixed inset-0 z-[-1] h-full w-full bg-black/30" on:click={() => (show = !show)} />
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
{#if showBanner}
	<div class="fixed top-10 z-20 w-full">
		<Banner
			bannerTxt="Check out our Road map"
			linkTxt="Read"
			linkHref="https://github.com/orgs/LoremLabs/projects/3/views/3"
		/>
	</div>
{/if}
