import type { RequestHandler } from '@sveltejs/kit';
import download from 'youtube-dl-exec';
import { createReadStream, unlinkSync } from 'fs';
import path from 'path';
import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
dotenv.config();

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.BUCKET_NAME;

if (!accessKeyId || !secretAccessKey) {
	throw new Error('AWS credentials are not set in environment variables.');
}

const s3Client = new S3Client({
	region: 'us-east-1',
	credentials: {
		accessKeyId: accessKeyId,
		secretAccessKey: secretAccessKey
	}
});

export const GET: RequestHandler = async ({ request }) => {
	const url = new URL(request.url);
	const link = url.searchParams.get('url');
	const format = url.searchParams.get('format');

	const s3 = new PutObjectCommand({
		Bucket: 'download-aio',
		Key: '',
		Body: 'Hello'
	});

	if (!link || !format) {
		return new Response('Both url and format are required', { status: 400 });
	}

	if (format !== 'mp4' && format !== 'mp3') {
		return new Response('Invalid format', { status: 400 });
	}

	console.log('starting download');

	const info = await download(link, {
		dumpSingleJson: true
	});

	const sanitizedTitle = info.title.replace(/[\/\\?%*:|"<>]/g, '-'); //check title for anything that will mess up the directories
	const outputPath = path.join('src', 'routes', 'api', 'download', `${sanitizedTitle}.${format}`);

	let options;

	if (link)

	if (format === 'mp3') {
		options = {
			extractAudio: true,
			audioFormat: 'mp3',
			output: outputPath
		};
	} else if (format === 'mp4') {
		options = {
			format: 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
			output: outputPath,
			mergeOutputFormat: 'mp4'
		};
	}

	await download(link, options);

	const fileStream = createReadStream(outputPath);

	const uploadParams = new PutObjectCommand({
		Bucket: bucketName,
		Key: `${info.title}.${format}`,
		Body: fileStream,
		ContentDisposition: 'attachment'
	});

	const getObjectCmd = new GetObjectCommand({
		Bucket: bucketName,
		Key: `${info.title}.${format}`
	});

	const deleteParams = new DeleteObjectCommand({
		Bucket: bucketName,
		Key: `${info.title}.${format}`
	});

	const deliveryUrl = await getSignedUrl(s3Client, getObjectCmd, { expiresIn: 3600 });

	try {
		const data = await s3Client.send(uploadParams);
		unlinkSync(outputPath);
		console.log(`File uploaded successfully at ${deliveryUrl}`);
	} catch (err) {
		console.log('Error', err);
	}

	return new Response(JSON.stringify({ downloadLink: deliveryUrl, title: info.title }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});

	/*    try {
        await s3Client.send(deleteParams);
        console.log(`File deleted successfully`);
    } catch (err) {
        console.log("Error", err);
    }*/
};
