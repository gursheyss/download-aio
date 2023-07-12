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
	let errorMsg = '';
	let showError = false;
	let showDownloading = false;
	let watermarkToggle = false;
	let selectedWebsite = 'youtube';
	let link = '';
	let format = 'mp4';

	const sites = {
		youtube:
			/(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be\.com\/\S*(?:watch)?(?:\/|%3Fv=|v=)?)([a-zA-Z0-9_-]{6,11})/,
		twitch:
			/^(https?:\/\/)?((www\.)?twitch\.tv\/videos\/\d+|(www\.)?twitch\.tv\/[A-Za-z0-9_-]+\/clip\/[A-Za-z0-9_-]+|clips\.twitch\.tv\/[A-Za-z0-9_-]+)$/,
		twitter: /(?:https?:\/\/)?(?:www\.)?twitter\.com\/[\w-]+\/[\w-]+/,
		instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[\w-]+\/[\w-]+/,
		tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com/,
		soundcloud: /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/
	};

	const validateLink = () => {
		let validationRegex = sites[selectedWebsite.toLowerCase()] || /.*/;
		isLinkValid = validationRegex.test(link);
		showInvalidLinkAlert = !isLinkValid;
	};

	//check if link is valid
	$: {
		if (link !== '' && isLinkValid) {
			showInvalidLinkAlert = false;
		}
	}

	//make mp3 if soundcloud selected
	$: {
		if (selectedWebsite.toLowerCase() === 'soundcloud') {
			format = 'mp3';
		} else {
			format = 'mp4';
		}
		if (
			selectedWebsite.toLowerCase() === 'youtube' ||
			selectedWebsite.toLowerCase() === 'twitch' ||
			selectedWebsite.toLowerCase() === 'twitter'
		) {
			watermarkToggle = false;
		}
	}

	$: {
		if (selectedWebsite) {
			showInvalidLinkAlert = false;
			showError = false;
		}
	}

	//3 dot loading thing
	let count = 0;
	let downloadMessage = 'Preparing download for requested media';
	let intervalId;

	$: {
		if (showDownloading) {
			clearInterval(intervalId);
			intervalId = setInterval(() => {
				count = (count + 1) % 4;
				downloadMessage = `Preparing download for requested media${'.'.repeat(count)}`;
			}, 1000);
		} else {
			clearInterval(intervalId);
		}
	}

	//download validation
	const validateAndDownload = (event: Event) => {
		event.preventDefault();
		validateLink();
		if (isLinkValid) {
			download();
		}
	};

	//download function
	const download = async () => {
		try {
			showError = false;
			showDownloading = true;
			const response = await fetch(
				`${base}/api/download?url=${encodeURIComponent(
					link
				)}&format=${format}&watermark=${watermarkToggle}`,
				{
					method: 'GET'
				}
			);
			if (response.ok) {
				showDownloading = false;
				const { downloadLink, title } = await response.json();
				const a = document.createElement('a');
				a.style.display = 'none';
				a.href = downloadLink;
				a.download = title;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
			} else if (response.status === 500) {
				showDownloading = false;
				const { error } = await response.json();
				showError = true;
				errorMsg = error;
			}
		} catch (err) {
			showError = true;
			errorMsg = 'Unexpected error occurred.';
			console.log('Error: ', err);
		}
	};
</script>

<svelte:head>
	<title>Download AIO</title>
</svelte:head>
<section class="flex flex-col items-center gap-2 px-4 pt-8 min-h-screen">
	<h1 class="text-3xl font-bold leading-tight md:text-5xl lg:leading-[1.1]">
		Download AIO
		<div class="invert px-1" style="display:inline-block">
			<a href="https://github.com/gursheyss/download-aio" target="_blank" rel="noopener noreferrer">
				<svg xmlns="http://www.w3.org/2000/svg" width=".8em" height=".8em" viewBox="0 0 24 24">
					<path
						d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
					/>
				</svg>
			</a>
		</div>
	</h1>
	<span class="max-w-[750px] text-lg text-muted-foreground sm:text-xl text-center sm:text-left">
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
		<div class="w-full flex items-center pt-4">
			<form class="flex-grow flex items-center space-x-2 dark">
				<Input bind:value={link} class="flex-grow" type="link" placeholder="Enter link here" />
				<Button type="submit" on:click={validateAndDownload}
					><Download class="mr-2 h-4 w-4" />Download</Button
				>
			</form>
			{#if selectedWebsite === 'tiktok'}
				<div class="flex items-center space-x-2 justify-start pl-4 dark">
					<Checkbox bind:checked={watermarkToggle} id="watermark" />
					<label
						for="watermark"
						class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						Watermark
					</label>
				</div>
			{/if}
			{#if selectedWebsite === 'youtube' || selectedWebsite === 'twitter' || selectedWebsite === 'twitch'}
				<div class="flex items-center space-x-2 justify-start pl-3 dark">
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
		</div>
		<div class="w-9/12 dark">
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
							{errorMsg}
						</AlertDescription>
					</Alert>
				</div>
			{/if}
			{#if showDownloading}
				<div class="pt-4">
					<Alert>
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>Preparing</AlertTitle>
						<AlertDescription>
							{downloadMessage}
						</AlertDescription>
					</Alert>
				</div>
			{/if}
			{#if selectedWebsite === 'instagram'}
				<div class="pt-4">
					<Alert>
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>Note</AlertTitle>
						<AlertDescription>Only reels are currently supported</AlertDescription>
					</Alert>
				</div>
			{/if}
			{#if selectedWebsite === 'twitch'}
				<div class="pt-4">
					<Alert>
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>Note</AlertTitle>
						<AlertDescription>Only clips and VODs are currently supported</AlertDescription>
					</Alert>
				</div>
			{/if}
		</div>
	</section>
</section>
