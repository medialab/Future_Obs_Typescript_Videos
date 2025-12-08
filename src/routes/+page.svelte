<script>
</script>

<section class="main_grid">
	<div class="flex v" id="videofiles_infos">
		<h2>Uploaded Files</h2>
		<div class="flex v">
			<div class="flex v minigap">
				<p class="microtitle">Uploaded videos:</p>
				<p class="annotation">13 videos</p>
			</div>
			<div class="flex v minigap">
				<p class="microtitle">Total payload:</p>
				<p class="annotation">450 mb</p>
			</div>
			<div class="flex v minigap">
				<p class="microtitle">CSV Rows:</p>
				<p class="annotation">15 rows</p>
			</div>
		</div>
	</div>
	<div class="upload_container"></div>
	<div class="flex v" id="alert_container"></div>
</section>

<style>
	.main_grid {
		display: grid;
		grid-template-columns: repeat(11, 1fr);
		gap: 50px;
		padding: 50px;
		height: 100%;
		width: 100%;
	}

	.flex {
		display: flex;
		gap: 20px;
	}

	.v {
		flex-direction: column;
	}

	.r {
		flex-direction: row;
	}

	.minigap {
		gap: 5px;
	}
</style>
