const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

// Configuration for bundle analysis
const ANALYZE = process.env.ANALYZE === 'true';
const PRODUCTION = process.env.NODE_ENV === 'production';

// Webpack configuration
const webpackConfig = {
  mode: PRODUCTION ? 'production' : 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, '../build'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    publicPath: '/',
    clean: true
  },
  optimization: {
    minimize: PRODUCTION,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: PRODUCTION,
            drop_debugger: PRODUCTION
          }
        }
      }),
      new CssMinimizerPlugin()
    ],
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: [
              '@babel/plugin-transform-runtime',
              '@babel/plugin-syntax-dynamic-import'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8kb
          }
        }
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8
    }),
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8
    })
  ]
};

// Add bundle analyzer in development
if (ANALYZE) {
  webpackConfig.plugins.push(new BundleAnalyzerPlugin());
}

// Run webpack build
webpack(webpackConfig, (err, stats) => {
  if (err) {
    console.error('Webpack build error:', err);
    process.exit(1);
  }

  const info = stats.toJson();
  
  if (stats.hasErrors()) {
    console.error('Build errors:', info.errors);
    process.exit(1);
  }

  if (stats.hasWarnings()) {
    console.warn('Build warnings:', info.warnings);
  }

  // Generate bundle report
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    chunks: info.chunks,
    assets: info.assets.map(asset => ({
      name: asset.name,
      size: asset.size,
      chunks: asset.chunks,
      chunkNames: asset.chunkNames
    })),
    modules: info.modules.map(module => ({
      name: module.name,
      size: module.size,
      chunks: module.chunks,
      reasons: module.reasons
    }))
  };

  // Save report to file
  fs.writeFileSync(
    path.join(__dirname, '../reports/bundle-report.json'),
    JSON.stringify(report, null, 2)
  );

  // Print summary
  console.log('\nBundle Analysis Summary:');
  console.log('------------------------');
  console.log(`Total size: ${(info.assets.reduce((acc, asset) => acc + asset.size, 0) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Number of chunks: ${info.chunks.length}`);
  console.log(`Number of assets: ${info.assets.length}`);
  console.log(`Number of modules: ${info.modules.length}`);
  
  // Print largest modules
  console.log('\nLargest Modules:');
  console.log('----------------');
  info.modules
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .forEach(module => {
      console.log(`${module.name}: ${(module.size / 1024).toFixed(2)} KB`);
    });

  // Generate visualization
  if (ANALYZE) {
    console.log('\nBundle visualization available at http://localhost:8888');
  }
});

// Function to analyze dependencies
function analyzeDependencies() {
  const packageJson = require('../package.json');
  const dependencies = packageJson.dependencies;
  const devDependencies = packageJson.devDependencies;

  console.log('\nDependency Analysis:');
  console.log('-------------------');
  
  // Analyze production dependencies
  console.log('\nProduction Dependencies:');
  Object.entries(dependencies).forEach(([name, version]) => {
    const size = getPackageSize(name);
    console.log(`${name}@${version}: ${size}`);
  });

  // Analyze development dependencies
  console.log('\nDevelopment Dependencies:');
  Object.entries(devDependencies).forEach(([name, version]) => {
    const size = getPackageSize(name);
    console.log(`${name}@${version}: ${size}`);
  });
}

// Function to get package size
function getPackageSize(packageName) {
  try {
    const result = execSync(`npm list ${packageName} --json`).toString();
    const data = JSON.parse(result);
    const size = data.size || 'Unknown';
    return size;
  } catch (error) {
    return 'Unknown';
  }
}

// Run dependency analysis
analyzeDependencies(); 