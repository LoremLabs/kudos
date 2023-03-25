<script>
	import { onMount } from 'svelte';

	export let identifier = '';

	// removing the did:kudos: prefix from the identifier
	let id = '';

	const calcId = () => {
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

		// set id to the appropriate value for the identifier type
		switch (identifierType) {
			case 'did:url:':
				id = identifier.replace('did:url:', '');
				break;
			case 'did:kudos:url:':
				id = identifier.replace('did:kudos:url:', '');
				break;
			case 'did:kudos:repo:':
				if (identifier.includes('git+https:')) {
					id = identifier.replace('did:kudos:repo:git+', '');
				} else if (identifier.includes('git://github.com')) {
					id = identifier.replace('did:kudos:repo:git://github.com', 'https://www.github.com');
				} else if (identifier.includes('did:kudos:repo:http:')) {
					id = identifier.replace('did:kudos:repo:http://', '');
				} else if (identifier.includes('did:kudos:repo:https:')) {
					id = identifier.replace('did:kudos:repo:https://', '');
				} else {
					id = '';
				}
				break;
			case 'did:kudos:reddit:':
				if (identifier.includes('reddit:u:')) {
					id = identifier.replace('did:kudos:reddit:u:', 'https://www.reddit.com/u/');
				} else if (identifier.includes('r:')) {
					id = identifier.replace('did:kudos:reddit:r:', 'https://www.reddit.com/r/');
				} else {
					id = '';
				}
				break;
			case 'did:kudos:twitter:':
				id = identifier.replace('did:kudos:twitter:', 'https://www.twitter.com/');
				break;
			case 'did:email:':
				id = identifier.replace('did:email:', '');
				break;
			case 'did:kudos:email:':
				id = identifier.replace('did:kudos:email:', '');
				break;
			case 'did:kudos:thing:':
				id = '';
				break;
			default:
				id = '';
				break;
		}

		if (id === '') {
			id = identifier;
		}
	};

	onMount(async () => {
		calcId();
	});

	// when identifier changes, recalculate id
	$: identifier && calcId();
</script>

{#if id}
	{id}
{/if}
