import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

// Configure
cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  upload_preset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  api_key: process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.VITE_CLOUDINARY_API_SECRET,
});

async function testUpload() {
  try {
    console.log('Iniciando upload...');
    const result = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      { public_id: 'test_image_vendpro' }
    );
    console.log('Upload bem-sucedido!');
    console.log('Secure URL:', result.secure_url);
  } catch (error) {
    console.error('Erro no upload:', error);
  }
}

testUpload();
