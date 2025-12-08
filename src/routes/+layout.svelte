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
		font-family: 'Instrument Sans', sans-serif;
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		border: 0;
		outline: 0;
		font-size: 100%;
		vertical-align: baseline;
		background: transparent;
		word-break: break-word;
		letter-spacing: -0.02em;
	}

	:global(.annotation) {
		font-size: 14px;
		color: #606060;
		letter-spacing: -0.02em;
	}

	:global(.microtitle) {
		font-size: 8px;
		color: #606060;
	}

	:global(.title) {
		font-size: 16px;
		color: #141414;
	}

	:global(.centered) {
		align-items: center;
		justify-content: center;
	}

	:global(.flex) {
		display: flex;
		gap: 20px;
	}

	:global(.v) {
		flex-direction: column;
	}

	:global(.r) {
		flex-direction: row;
	}

	:global(.minigap) {
		gap: 5px;
	}
</style>
