<script lang="ts">
	import { Button } from '$components/ui/button';
	import { Download } from 'lucide-svelte';
	import { Tabs, TabsList, TabsTrigger } from '$components/ui/tabs';
	import { AlertCircle } from 'lucide-svelte';
	import { Alert, AlertDescription, AlertTitle } from '$components/ui/alert';
	import { Input } from '$components/ui/input';
	import { Label } from '$components/ui/label';
	import { RadioGroupItem, RadioGroup } from '$components/ui/radio-group';
	import { base } from '$app/paths';
	import ShowWatermarkToggle from '$components/ShowWatermarkToggle.svelte';
	import Title from '$components/Title.svelte';

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
		twitter: /(?:https?:\/\/)?(?:www\.)?twitter\.com\/[\w-]+\/[\w-]+/,
		instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[\w-]+\/[\w-]+/,
		tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com/,
		soundcloud: /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/,
		twitch:
			/^(https?:\/\/)?((www\.)?twitch\.tv\/videos\/\d+|(www\.)?twitch\.tv\/[A-Za-z0-9_-]+\/clip\/[A-Za-z0-9_-]+|clips\.twitch\.tv\/[A-Za-z0-9_-]+)$/,
		rumble: /(?:https?:\/\/)?(?:www\.)?rumble\.com/
	};

	const validateLink = () => {
		let validationRegex = sites[selectedWebsite.toLowerCase() as keyof typeof sites];
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
	let intervalId: number | undefined;

	$: {
		if (showDownloading) {
			clearInterval(intervalId);
			intervalId = setInterval(() => {
				count = (count + 1) % 4;
				downloadMessage = `Preparing download for requested media${'.'.repeat(count)}`;
			}, 1000) as unknown as number;
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
	<Title />
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
				<ShowWatermarkToggle {watermarkToggle} />
			{/if}
			{#if selectedWebsite === 'youtube' || selectedWebsite === 'twitter' || selectedWebsite === 'twitch' || selectedWebsite === 'rumble'}
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
