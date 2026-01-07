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
		font-size: 22px;
		color: #0a0a0a;
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

	:global(.mediumgap) {
		gap: 10px;
	}

	:global(.minigap) {
		gap: 5px;
	}

	:global(.spacebetween) {
		justify-content: space-between;
	}

	:global(.pending) {
		background-color: #f2f2f2;
		border: 1px solid #d6d6d6;
	}

	:global(.warning) {
		background-color: #fff4dd;
		border: 1px solid #dc9600;
	}
	:global(.error) {
		background-color: #fff0f0;
		border: 1px solid #f90000;
	}
	:global(.success) {
		background-color: #e9ffe7 !important;
		border: 1px solid #0b8400 !important;
	}

	:global(a) {
		text-decoration: none;
		color: unset;
		cursor: pointer;
	}

	:global(button) {
		word-wrap: none;
		word-break: keep-all;
		overflow-wrap: normal;
		text-overflow: ellipsis;
		display: inline-block;
		vertical-align: middle;
		white-space: nowrap;
		text-align: center;
		width: fit-content;
		border: solid 1px #d6d6d6;
		border-radius: 10px;
		padding: 5px 10px;
		cursor: pointer;
		background-color: #f2f2f2;
		pointer-events: visible;
		transition: all 0.3s ease-in-out;
	}

	:global(button:hover) {
		transform: scale(1.02);
		transition: all 0.3s ease-in-out;
	}

	:global(.btn_icon) {
		width: 20px;
		height: 20px;
		object-fit: contain;
		object-position: center;
	}

	:global(.main_grid) {
		display: grid;
		grid-template-columns: repeat(11, 1fr);
		gap: 20px;
		padding: 20px;
		height: 100%;
		width: 100%;
		margin-top: 100px;
		overflow: visible;
	}

	:global(.main_grid :nth-child(1)),
	:global(.main_grid :nth-child(3)) {
		grid-column: span 2;
	}

	:global(.main_grid :nth-child(2)) {
		grid-column: span 7;
	}

	:global(.disabled) {
		opacity: 0.2;
		cursor: not-allowed;
		pointer-events: none;
	}

	:global(.trash_btn) {
		width: 25px;
		height: 25px;
		cursor: pointer;
		pointer-events: all;
		border: none;
		background-color: transparent;
	}

	:global(.trash_btn:hover > img) {
		transform: scale(1.1) rotate(2deg);
		transition: transform 0.3s ease-in-out;
	}
</style>
