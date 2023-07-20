import type { RequestHandler } from '@sveltejs/kit';
import download from 'youtube-dl-exec';
import { createReadStream, unlinkSync, readdirSync, mkdirSync, rmdirSync } from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const TEMP_DIR = './tmp';

function initS3() {
	const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
	const bucketName = process.env.BUCKET_NAME;

	if (!accessKeyId || !secretAccessKey) {
		throw new Error('AWS credentials are not set in environment variables.');
	}

	const s3Client = new S3Client({
		region: process.env.AWS_REGION,
		credentials: { accessKeyId, secretAccessKey }
	});

	return { bucketName, s3Client };
}

function getOptions(format: string, watermark: boolean, link: string) {
	let options = {};

	if (format === 'mp3') options = getMP3Options();
	else if (format === 'mp4') options = getMP4Options(watermark, link);

	return options;
}

function getMP3Options() {
	return {
		extractAudio: true,
		audioFormat: 'mp3',
		embedThumbnail: true,
		noCheckCertificates: true,
		output: path.join(TEMP_DIR, '%(title)s.%(ext)s')
	};
}

function getMP4Options(watermark: boolean, link: string) {
	let options;

	if (watermark) options = getMP4WithWatermarkOptions();
	else options = getMP4WithoutWatermarkOptions(link);

	return options;
}

function getMP4WithWatermarkOptions() {
	return {
		format: 'best[format_note*=watermarked]',
		mergeOutputFormat: 'mp4',
		output: path.join(TEMP_DIR, '%(title)s.%(ext)s')
	};
}

function getMP4WithoutWatermarkOptions(link: string) {
	let embedThumbnailValue = true;
	if (link && link.includes('rumble')) embedThumbnailValue = false;

	return {
		format: 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
		mergeOutputFormat: 'mp4',
		embedThumbnail: embedThumbnailValue,
		output: path.join(TEMP_DIR, '%(title)s.%(ext)s')
	};
}

//s3 init
const { bucketName, s3Client } = initS3();

export const GET: RequestHandler = async ({ request }) => {
	const url = new URL(request.url);
	const link = url.searchParams.get('url');
	const format = url.searchParams.get('format');
	const watermark = url.searchParams.get('watermark') === 'true';

	if (!link || !format) return new Response('Both url and format are required', { status: 400 });

	if (format !== 'mp4' && format !== 'mp3') return new Response('Invalid format', { status: 400 });

	const options = getOptions(format, watermark, link);

	mkdirSync(TEMP_DIR, { recursive: true });

	await download(link, options);

	const filesInDir = readdirSync(TEMP_DIR);
	if (!filesInDir.length) {
		return new Response(JSON.stringify({ error: 'Download failed.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const filename = filesInDir[0];
	const fileStream = createReadStream(path.join(TEMP_DIR, filename));
	const uploadParams = new PutObjectCommand({
		Bucket: bucketName,
		Key: filename,
		Body: fileStream,
		ContentDisposition: 'attachment'
	});
	const getObjectCmd = new GetObjectCommand({ Bucket: bucketName, Key: filename });
	const deliveryUrl = await getSignedUrl(s3Client, getObjectCmd, { expiresIn: 3600 });

	try {
		await s3Client.send(uploadParams);
		console.log(`File uploaded successfully at ${deliveryUrl}`);
	} catch (err) {
		console.log('Error', err);
		return new Response(JSON.stringify({ error: 'An error occurred during processing.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		unlinkSync(path.join(TEMP_DIR, filename));
		rmdirSync(TEMP_DIR);
	} catch (err) {
		console.log('Error deleting the file: ', err);
		return new Response(JSON.stringify({ error: 'An error occurred during processing.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({ downloadLink: deliveryUrl }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
