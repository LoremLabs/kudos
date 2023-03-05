<script>
	import { onMount } from 'svelte';

	export let identifier = '';

	let klass = 'w-3 h-3 ml-1 mt-0.5';
	export { klass as class };

	let link = 'about:blank';

	const calcLink = () => {
		// given a string like 'did:kudos:url:https://example.com', set identifierType to did:kudos:url
		// switch on identifierType for various identifier types: did:kudos:url, did:kudos:email, did:kudos:thing, etc
		let identifierType;
		if (identifier.startsWith('did:kudos')) {
			identifierType =
				identifier.split(':')[0] +
				':' +
				identifier.split(':')[1] +
				':' +
				identifier.split(':')[2] +
				':';
		} else {
			identifierType = identifier.split(':')[0] + ':' + identifier.split(':')[1] + ':';
		}

		// set link to the appropriate value for the identifier type
		switch (identifierType) {
			case 'did:url:':
				link = identifier.replace('did:url:', '');
				break;
			case 'did:kudos:url:':
				link = identifier.replace('did:kudos:url:', '');
				break;
			case 'did:kudos:repo:':
				if (identifier.includes('git+https:')) {
					link = identifier.replace('did:kudos:repo:git+https:', '');
				} else if (identifier.includes('git://github.com')) {
					link = identifier.replace('did:kudos:repo:git://github.com', 'https://www.github.com');
				} else {
					link = '';
				}
				break;
			case 'did:kudos:reddit:':
				if (identifier.includes('reddit:u:')) {
					link = identifier.replace('did:kudos:reddit:u:', 'https://www.reddit.com/u/');
				} else if (identifier.includes('r:')) {
					link = identifier.replace('did:kudos:reddit:r:', 'https://www.reddit.com/r/');
				} else {
					link = '';
				}
				break;
			case 'did:kudos:twitter:':
				link = identifier.replace('did:kudos:twitter:', 'https://www.twitter.com/');
				break;
			case 'did:kudos:email:':
				link = identifier.replace('did:kudos:email:', 'mailto:');
				break;
			case 'did:kudos:thing:':
				link = '';
				break;
			default:
				link = '';
				break;
		}
	};

	onMount(async () => {
		calcLink();
	});

	// when identifier changes, recalculate link
	$: identifier && calcLink();
</script>

{#if link}
	<a href={link} title="External Link" target="_blank" rel="noreferrer">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			class={`${klass}`}
		>
			<path
				fill-rule="evenodd"
				d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
				clip-rule="evenodd"
			/>
			<path
				fill-rule="evenodd"
				d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
				clip-rule="evenodd"
			/>
		</svg>
	</a>
{/if}
