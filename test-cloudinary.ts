import { v2 as cloudinary } from 'cloudinary';

// Configure
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
  try {
    console.log('Iniciando upload...');
    const result = await cloudinary.uploader.upload(
      'https://cloudinary-devs.github.io/cld-docs-assets/assets/images/logo.png',
      { public_id: 'test_image_vendpro' }
    );
    console.log('Upload bem-sucedido!');
    console.log('Secure URL:', result.secure_url);
  } catch (error) {
    console.error('Erro no upload:', error);
  }
}

testUpload();
