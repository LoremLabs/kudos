<script>
	const OPENGRAPH = {
		title: 'Kudos Community: Support the creators you love',
		description: 'Kudos Community: Support the creators you love',
		keywords:
			'kudos, xrpl, xrp, webmon, web monetization, creator, creator economy, creator support, creator funding',
		siteName: 'Kudos.Community',
		shareImage: `https://www.kudos.community/share.png`
	};

	export let title = undefined;
	export let description = undefined;
	export let keywords = undefined;
	export let canonical = undefined;
	export let schemas = []; // jsonld schemas tktk
	export let page = {};
	export let shareImage = '';
	export let webmonPaymentPointer = '';

	const serializeSchema = (schema) => {
		return (
			`<script type="application/ld+json">
        ${JSON.stringify(schema, null, 1)}
      </scr` + 'ipt>'
		); // keep code formatters from complaining
	};

	// <Meta page={{ ...page, ...{ meta: { description: 'hi', keywords: 'moo,foo,zoo' } } }} {pageId} />
</script>

<svelte:head>
	<meta property="og:site_name" content={OPENGRAPH.siteName} />
	<meta name="twitter:site" content={OPENGRAPH.siteName} />
	{#if webmonPaymentPointer}
		<meta name="monetization" content={webmonPaymentPointer} />
	{/if}
	{#if description}
		<meta name="description" content={description} />
		<meta property="og:description" content={description} />
	{:else if page.meta?.description}
		<meta name="description" content={page.meta?.description} />
		<meta property="og:description" content={page.meta?.description} />
		<meta name="twitter:description" content={page.meta?.description} />
	{:else}
		<meta name="description" content={OPENGRAPH.description} />
		<meta property="og:description" content={OPENGRAPH.description} />
		<meta name="twitter:description" content={OPENGRAPH.description} />
	{/if}

	{#if canonical}
		<link rel="canonical" href={canonical} />
		<meta property="og:url" content={canonical} />
	{/if}

	{#if keywords}
		<meta name="keywords" content={keywords} />
	{:else if page.meta?.keywords}
		<meta name="keywords" content={page.meta?.keywords} />
	{:else}
		<meta name="keywords" content={OPENGRAPH.keywords} />
	{/if}

	{#if page.title}
		<meta property="og:title" content={`${page.title} on ${OPENGRAPH.title}`} />
		<meta name="twitter:title" content={`${page.title} on ${OPENGRAPH.title}`} />
	{:else}
		<meta property="og:title" content={title || OPENGRAPH.title} />
		<meta name="twitter:title" content={title || OPENGRAPH.title} />
	{/if}

	<meta property="og:type" content={page.meta?.ogType || 'article'} />

	{#if page.meta?.publish}
		<meta property="article:published_time" content={page.meta.publish} />
	{/if}
	{#if page.meta?.modified}
		<meta property="article:modified_time" content={page.meta.modified} />
	{/if}
	{#if page.meta?.section || page.meta?.publicationId}
		<meta property="article:section" content={page.meta?.section || page.meta?.publicationId} />
	{/if}
	{#if page.meta?.tags}
		<meta property="article:tag" content={page.meta.tags} />
	{/if}

	{#if shareImage}
		<meta property="og:image" content={shareImage} />
		<meta name="twitter:image" content={shareImage} />
	{:else if OPENGRAPH.shareImage}
		<meta property="og:image" content={OPENGRAPH.shareImage} />
		<meta name="twitter:image" content={OPENGRAPH.shareImage} />
	{/if}

	{#if page.meta?.ogImageWidth}
		<meta property="og:image:width" content={page.meta.ogImageWidth} />
	{/if}
	{#if page.meta?.ogImageHeight}
		<meta property="og:image:height" content={page.meta.ogImageHeight} />
	{/if}

	{#if page.meta?.ogVideo}
		<meta property="og:video" content={page.meta.ogVideo} />
	{/if}
	{#if page.meta?.ogVideoSecure}
		<meta property="og:video:secure_url" content={page.meta.ogVideoSecure} />
	{/if}
	{#if page.meta?.ogVideoType}
		<meta property="og:video:type" content={page.meta.ogVideoType} />
	{/if}
	{#if page.meta?.ogVideoWidth}
		<meta property="og:video:width" content={page.meta.ogVideoWidth} />
	{/if}
	{#if page.meta?.ogVideoHeight}
		<meta property="og:video:height" content={page.meta.ogVideoHeight} />
	{/if}

	{#if page.meta?.ogAudio}
		<meta property="og:audio" content={page.meta.ogAudio} />
	{/if}
	{#if page.meta?.ogAudioSecure}
		<meta property="og:audio:secure_url" content={page.meta.ogAudioSecure} />
	{/if}
	{#if page.meta?.ogAudioType}
		<meta property="og:audio:type" content={page.meta.ogAudioType} />
	{/if}
	{#if page.meta?.ogAudioWidth}
		<meta property="og:audio:width" content={page.meta.ogAudioWidth} />
	{/if}

	<meta name="twitter:card" content={page.meta?.twitterCard || 'summary_large_image'} />

	{#if title || OPENGRAPH.title}
		<title>{title || OPENGRAPH.title}</title>
	{/if}

	{#each schemas as schema}
		{@html serializeSchema(schema)}
	{/each}
	<slot />
</svelte:head>
