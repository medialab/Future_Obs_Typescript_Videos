<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(*) {
		font-family: 'Rethink Sans', sans-serif;
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		border: 0;
		outline: 0;
		font-size: 100%;
		vertical-align: baseline;
		background: transparent;
		word-break: break-word;
	}

	:global(.annotation) {
		font-size: 16px;
		color: #606060;
		font-kerning: -0.02em;
	}

	:global(.microtitle) {
		font-size: 8px;
		color: #606060;
	}
</style>
