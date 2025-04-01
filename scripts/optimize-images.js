const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const IMAGES_DIR = path.join(__dirname, '../frontend/public/images');
const OPTIMIZED_DIR = path.join(__dirname, '../frontend/public/images/optimized');

// Image optimization settings
const OPTIMIZATION_SETTINGS = {
  quality: 80,
  formats: ['webp', 'avif'],
  sizes: [192, 512, 1024],
  fit: 'inside',
  withoutEnlargement: true
};

// Ensure optimized directory exists
if (!fs.existsSync(OPTIMIZED_DIR)) {
  fs.mkdirSync(OPTIMIZED_DIR, { recursive: true });
}

async function optimizeImage(inputPath, outputDir) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  const stats = await stat(inputPath);
  
  console.log(`Optimizing ${filename}...`);
  
  // Generate optimized versions for each size
  for (const size of OPTIMIZATION_SETTINGS.sizes) {
    // Generate WebP version
    await sharp(inputPath)
      .resize(size, size, {
        fit: OPTIMIZATION_SETTINGS.fit,
        withoutEnlargement: OPTIMIZATION_SETTINGS.withoutEnlargement
      })
      .webp({ quality: OPTIMIZATION_SETTINGS.quality })
      .toFile(path.join(outputDir, `${filename}-${size}.webp`));
    
    // Generate AVIF version
    await sharp(inputPath)
      .resize(size, size, {
        fit: OPTIMIZATION_SETTINGS.fit,
        withoutEnlargement: OPTIMIZATION_SETTINGS.withoutEnlargement
      })
      .avif({ quality: OPTIMIZATION_SETTINGS.quality })
      .toFile(path.join(outputDir, `${filename}-${size}.avif`));
  }
  
  // Generate original format version
  await sharp(inputPath)
    .resize(OPTIMIZATION_SETTINGS.sizes[0], OPTIMIZATION_SETTINGS.sizes[0], {
      fit: OPTIMIZATION_SETTINGS.fit,
      withoutEnlargement: OPTIMIZATION_SETTINGS.withoutEnlargement
    })
    .toFile(path.join(outputDir, `${filename}-${OPTIMIZATION_SETTINGS.sizes[0]}${path.extname(inputPath)}`));
  
  console.log(`✓ Optimized ${filename}`);
}

async function processDirectory(dir) {
  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await stat(filePath);
    
    if (stats.isDirectory()) {
      const outputDir = path.join(OPTIMIZED_DIR, path.relative(IMAGES_DIR, filePath));
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      await processDirectory(filePath);
    } else if (stats.isFile() && /\.(jpg|jpeg|png|gif)$/i.test(file)) {
      const outputDir = path.join(OPTIMIZED_DIR, path.relative(IMAGES_DIR, dir));
      await optimizeImage(filePath, outputDir);
    }
  }
}

// Generate image manifest
async function generateImageManifest() {
  const manifest = {
    images: {}
  };
  
  const files = await readdir(OPTIMIZED_DIR);
  
  for (const file of files) {
    const filePath = path.join(OPTIMIZED_DIR, file);
    const stats = await stat(filePath);
    
    if (stats.isFile()) {
      const filename = path.basename(file, path.extname(file));
      const [name, size] = filename.split('-');
      const ext = path.extname(file);
      
      if (!manifest.images[name]) {
        manifest.images[name] = {
          sizes: {},
          formats: {}
        };
      }
      
      if (size) {
        manifest.images[name].sizes[size] = `/images/optimized/${file}`;
      }
      
      if (ext === '.webp' || ext === '.avif') {
        manifest.images[name].formats[ext.slice(1)] = `/images/optimized/${file}`;
      }
    }
  }
  
  fs.writeFileSync(
    path.join(__dirname, '../frontend/src/manifests/image-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
}

// Main execution
async function main() {
  try {
    console.log('Starting image optimization...');
    await processDirectory(IMAGES_DIR);
    await generateImageManifest();
    console.log('✓ Image optimization complete');
  } catch (error) {
    console.error('Error during image optimization:', error);
    process.exit(1);
  }
}

main(); 