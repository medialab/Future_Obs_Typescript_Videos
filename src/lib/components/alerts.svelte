<script lang="ts">

    

type AlertType = 'success' | 'error' | 'warning';

let props = $props<{
    type: AlertType;
    message: string;
}>();


</script>

{#if props.message}
    <div class="alert_container flex h"
    class:success={props.type === 'success'}
        class:error={props.type === 'error'}
        class:warning={props.type === 'warning'}>
        <div class="alert_dot"
        class:success={props.type === 'success'}
        class:error={props.type === 'error'}
        class:warning={props.type === 'warning'}>

        </div>
        <p class="alert_message annotation">{props.message}</p>
    </div>
{/if}

<style>
    .alert_message {
        font-size: 12px;
        word-wrap: break-all;
        word-break: break-word;
        overflow-wrap: break-word;
        text-overflow: ellipsis;
        width: fit-content;
    }

    .alert_container {
        border-radius: 15px;
        padding: 7px 10px;
        gap: 8px;
        width: fit-content;
        align-items: center;
    }

    

    .alert_dot {
        width: 7px;
        height: 7px;
        border-radius: 100%;
    }

    .alert_dot.warning {
        background-color: #dc9600;
        color: #dc9600;
    }
    .alert_dot.error {
        background-color: #F90000;
        color: #F90000;
    }
    .alert_dot.success {
        background-color: #0b8400;
        color: #0b8400;
    }

</style>