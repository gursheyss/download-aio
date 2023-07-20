<script lang="ts">
	import { Checkbox } from '$components/ui/checkbox/index.js';
	export let watermarkToggle: boolean;
</script>

<div class="flex items-center space-x-2 justify-start pl-4 dark">
	<Checkbox bind:checked={watermarkToggle} id="watermark" />
	<label
		for="watermark"
		class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
	>
		Watermark
	</label>
</div>
