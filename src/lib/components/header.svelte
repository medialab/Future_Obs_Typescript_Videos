<script lang="ts">
let props = $props();

import { resolve } from "$app/paths";
import { missingFilenames, uploadedCsvFile } from "$lib/stores";
</script>

<header class="header flex h spacebetween">
    {#if props.type === 'home'}
        <p class="annotation">Etnographic video composer V0.1</p>
        <a href={resolve('/composer')} class:disabled={$missingFilenames.length !== 0 || $uploadedCsvFile === null}><p class="annotation">Composer →</p></a>
    {:else if props.type === 'composer'}
        <a href={resolve('/')}><p class="annotation">← Uploads panel</p></a>
        <p class="annotation">Etnographic video composer V0.1</p>
    {/if}
    
</header>

<style>
.header {
    padding: 20px 20px;
    border-bottom: 0.5px solid #DEDEDE;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background-color: #ffffff;
}
</style>