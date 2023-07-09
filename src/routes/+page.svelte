<script lang="ts">
	import { Button } from '$components/ui/button';
	import { Download } from 'lucide-svelte';
	import { Tabs, TabsList, TabsTrigger } from '$components/ui/tabs';
	import { AlertCircle } from 'lucide-svelte';
	import { Alert, AlertDescription, AlertTitle } from '$components/ui/alert';
	import { Input } from '$components/ui/input';
	import { Label } from '$components/ui/label';
	import { RadioGroupItem, RadioGroup } from '$components/ui/radio-group';
	import { Checkbox } from '$components/ui/checkbox';
	import { base } from '$app/paths';

	let isLinkValid = true;
	let showInvalidLinkAlert = false;
	let error = '';
	let showError = false;
	let showProgress = false;
	let title = '';

	const sites = {
		youtube:
			/(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be\.com\/\S*(?:watch)?(?:\/|%3Fv=|v=)?)([a-zA-Z0-9_-]{6,11})/,
		twitch: /(?:https?:\/\/)?(?:www\.)?twitch\.tv/,
		kick: /(?:https?:\/\/)?(?:www\.)?kick\.com/,
		tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@\w+\/video\/\d+/,
		soundcloud: /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/
	};

	const validateLink = () => {
		let validationRegex = sites[selectedWebsite.toLowerCase()] || /.*/;
		isLinkValid = validationRegex.test(link);
		showInvalidLinkAlert = !isLinkValid;
	};

	$: {
		if (link !== '' && isLinkValid) {
			showInvalidLinkAlert = false;
		}
		if (selectedWebsite.toLowerCase() === 'soundcloud') {
			format = 'mp3';
		} else {
			format = 'mp4';
		}
	}

	const validateAndDownload = (event: Event) => {
		event.preventDefault();
		validateLink();
		if (isLinkValid) {
			download();
		}
	};

	let selectedWebsite = 'Youtube';
	let link = '';
	let format = 'mp4';

	const download = async () => {
		const response = await fetch(
			`${base}/api/download?url=${encodeURIComponent(link)}&format=${format}`,
			{
				method: 'GET'
			}
		);
		if (response.ok) {
			const { downloadLink, title } = await response.json();
			const a = document.createElement('a');
			a.style.display = 'none';
			a.href = downloadLink;
			a.download = title;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	};
</script>

<section class="flex flex-col items-center gap-2 px-4 pt-8 min-h-screen">
	<h1 class="text-3xl font-bold leading-tight md:text-5xl lg:leading-[1.1]">Download AIO</h1>
	<span class="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
		Download media from multiple platforms seamlessly
	</span>
	<section class="flex flex-col items-center justify-center pt-3">
		<Tabs bind:value={selectedWebsite}>
			<TabsList>
				{#each Object.keys(sites) as site}
					<TabsTrigger value={site}>{site.charAt(0).toUpperCase() + site.slice(1)}</TabsTrigger>
				{/each}
			</TabsList>
		</Tabs>
		<div class="w-full dark">
			<form class="flex items-center space-x-2 pt-4">
				<Input bind:value={link} class="flex" type="link" placeholder="Enter link here" />
				<Button type="submit" on:click={validateAndDownload}
					><Download class="mr-2 h-4 w-4" />Download</Button
				>
			</form>
			{#if selectedWebsite === 'tiktok'}
				<div class="flex items-center space-x-2 justify-start pt-4">
					<Checkbox id="watermark" />
					<label
						for="watermark"
						class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						Watermark
					</label>
				</div>
			{/if}
			{#if (selectedWebsite === 'youtube') | 'twitch' | 'kick' | 'tiktok'}
				<div class="flex items-center space-x-2 justify-start pt-4">
					<RadioGroup bind:value={format}>
						<div class="flex items-center space-x-2">
							<RadioGroupItem value="mp3" id="mp3" />
							<Label for="mp3">mp3</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroupItem value="mp4" id="mp4" />
							<Label for="mp4">mp4</Label>
						</div>
					</RadioGroup>
				</div>
			{/if}
			{#if showInvalidLinkAlert}
				<div class="pt-4">
					<Alert variant="destructive">
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>
							Please provide a valid {selectedWebsite} link.
						</AlertDescription>
					</Alert>
				</div>
			{/if}
			{#if showError}
				<div class="pt-4">
					<Alert variant="destructive">
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>
							{error}
						</AlertDescription>
					</Alert>
				</div>
			{/if}
			{#if showError}
				<div class="pt-4">
					<Alert>
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>Download Started</AlertTitle>
						<AlertDescription>
							Downloading {title}
						</AlertDescription>
					</Alert>
				</div>
			{/if}
		</div>
	</section>
</section>
