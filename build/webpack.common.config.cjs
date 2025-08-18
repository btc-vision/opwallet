const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TSConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const WasmModuleWebpackPlugin = require('wasm-module-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { getBrowserPaths } = require('./paths.cjs');

// style files regexes
const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const lessRegex = /\.less$/;
const lessModuleRegex = /\.module\.less$/;

const loaderUtils = require('loader-utils');

const getCSSModuleLocalIdent = (context, localIdentName, localName, options) => {
    // Create a hash based on the filename and class name
    const fileNameOrFolder = context.resourcePath.match(
        /index\.module\.(css|scss|sass|less)$/
    )
        ? '[folder]'
        : '[name]';

    const hash = loaderUtils.getHashDigest(
        path.posix.relative(context.rootContext, context.resourcePath) + localName,
        'md5',
        'base64',
        5
    );

    return loaderUtils
        .interpolateName(
            context,
            fileNameOrFolder + '_' + localName + '__' + hash,
            options
        )
        .replace(/\.module/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_');
};

const config = (env) => {
    // Determine dev/prod
    const isEnvProduction = env.config === 'pro' || env.config === 'production';
    const isEnvDevelopment = env.config === 'dev' || env.config === 'development';

    const version = env.version;
    const paths = getBrowserPaths(env.browser);

    const manifest = env.manifest;
    const channel = env.channel;

    // You can tweak this if you actually want source maps in production
    const shouldUseSourceMap = false;

    const imageInlineSizeLimit = parseInt(process.env.IMAGE_INLINE_SIZE_LIMIT || '10000');

    // You can enable React Refresh only in dev if you like:
    const shouldUseReactRefresh = isEnvDevelopment;

    // Common function to set up style loaders (CSS, PostCSS, etc.),
    // plus an optional pre-processor (less-loader, sass-loader, stylus-loader).
    // Replace the existing getStyleLoaders function with this updated version:

    const getStyleLoaders = (cssOptions, preProcessor) => {
        const loaders = [
            // In dev, inject styles via <style> tags; in prod, extract to .css files.
            isEnvDevelopment && require.resolve('style-loader'),
            isEnvProduction && {
                loader: MiniCssExtractPlugin.loader,
                options: paths.publicUrlOrPath.startsWith('.') ? { publicPath: '../../' } : {}
            },
            {
                loader: require.resolve('css-loader'),
                options: cssOptions
            },
            {
                loader: require.resolve('postcss-loader'),
                options: {
                    postcssOptions: {
                        // Remove the inline plugin configuration
                        // Let PostCSS use the postcss.config.cjs file instead
                    },
                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment
                }
            }
        ].filter(Boolean);

        if (preProcessor) {
            let preProcessorOptions = { sourceMap: true };

            if (preProcessor === 'less-loader') {
                // Custom theme variables if needed
                preProcessorOptions = {
                    sourceMap: true,
                    lessOptions: {
                        modifyVars: {
                            'primary-color': 'rgb(234,202,68)',
                            'primary-color-active': '#383535',
                            'input-icon-hover-color': '#FFFFFF',
                            'component-background': '#070606',
                            'select-dropdown-bg': '#2A2626',
                            'select-item-selected-bg': '#332F2F',
                            'select-item-active-bg': '#332F2F',
                            'input-border-color': 'rgba(255,255,255,0.2)',
                            borderColor: 'rgba(255,255,255,0.2)',
                            'input-hover-border-color': 'rgba(255,255,255,0.4)',
                            hoverBorderColor: 'rgba(255,255,255,0.4)',
                            'border-color-base': 'rgba(255,255,255,0.2)',
                            'border-width-base': '0',
                            'animation-duration-slow': '0.08s',
                            'animation-duration-base': '0.08s',
                            'layout-header-background': '#2A2626',
                            'layout-header-padding': '0 1.875rem',
                            'layout-header-height': '5.625rem',
                            'layout-footer-padding': 'unset',
                            'border-radius-base': '0.3rem',
                            'checkbox-border-radius': '0.125rem',
                            'heading-color': '#ffffff',
                            'font-size-base': '1.125rem',
                            'line-height-base': '1.375rem',
                            'text-color': '#ffffff',
                            'text-color-secondary': '#AAAAAA',
                            'height-lg': '3.875rem',
                            'checkbox-size': '1.5rem',
                            'btn-text-hover-bg': '#383535',
                            'input-disabled-color': 'rgba(255,255,255,0.6)'
                        },
                        javascriptEnabled: true
                    }
                };
            }

            loaders.push(
                {
                    loader: require.resolve('resolve-url-loader'),
                    options: {
                        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                        root: paths.appSrc
                    }
                },
                {
                    loader: require.resolve(preProcessor),
                    options: preProcessorOptions
                }
            );
        }

        return loaders;
    };

    const finalConfig = {
        entry: {
            background: paths.rootResolve('src/background/index.ts'),
            'content-script': paths.rootResolve('src/content-script/index.ts'),
            pageProvider: paths.rootResolve('src/content-script/pageProvider/index.ts'),
            ui: paths.rootResolve('src/ui/index.tsx')
        },
        output: {
            path: paths.dist,
            filename: '[name].js',
            publicPath: '/',
            module: true, // Enable ES modules output
            chunkFormat: 'module', // Use ES module format for chunks
            environment: {
                module: true,
                dynamicImport: true // MV3 supports dynamic imports
            }
        },
        module: {
            rules: [
                // Optionally handle node_modules packages that contain sourcemaps
                shouldUseSourceMap && {
                    enforce: 'pre',
                    exclude: /@babel(?:\/|\\{1,2})runtime/,
                    test: /\.(js|mjs|jsx|ts|tsx|css)$/,
                    loader: require.resolve('source-map-loader')
                },
                {
                    oneOf: [
                        {
                            test: [/\.avif$/],
                            type: 'asset',
                            mimetype: 'image/avif',
                            parser: {
                                dataUrlCondition: {
                                    maxSize: imageInlineSizeLimit
                                }
                            }
                        },
                        {
                            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                            type: 'asset',
                            parser: {
                                dataUrlCondition: {
                                    maxSize: imageInlineSizeLimit
                                }
                            }
                        },
                        // Modern approach for SVG:
                        // - Use asset/resource for the final file
                        // - Also run @svgr/webpack for React components
                        {
                            test: /\.svg$/,
                            type: 'asset/resource',
                            generator: {
                                filename: 'static/media/[name].[hash][ext]'
                            },
                            issuer: {
                                and: [/\.(ts|tsx|js|jsx|md|mdx)$/]
                            },
                            use: [
                                {
                                    loader: require.resolve('@svgr/webpack'),
                                    options: {
                                        prettier: false,
                                        svgo: false,
                                        svgoConfig: { plugins: [{ removeViewBox: false }] },
                                        titleProp: true,
                                        ref: true
                                    }
                                }
                            ]
                        },

                        {
                            test: /\.(js|jsx)$/,
                            include: paths.appSrc,
                            use: [
                                {
                                    loader: require.resolve('swc-loader'),
                                    options: {
                                        jsc: {
                                            parser: {
                                                syntax: "ecmascript",
                                                jsx: true,
                                                decorators: true,
                                                dynamicImport: true
                                            },
                                            transform: {
                                                legacyDecorator: true,
                                                decoratorMetadata: true,
                                                react: {
                                                    runtime: "automatic",
                                                    development: isEnvDevelopment,
                                                    refresh: isEnvDevelopment && shouldUseReactRefresh,
                                                    throwIfNamespace: true,
                                                    useBuiltins: true
                                                }
                                            },
                                            target: "es2022",
                                            externalHelpers: true,
                                            loose: false
                                        },
                                        module: {
                                            type: "es6"
                                        },
                                        sourceMaps: isEnvDevelopment
                                    }
                                }
                            ]
                        },

                        // TS/TSX with ts-loader and optional Babel
                        {
                            test: /\.(ts|tsx)$/,
                            include: paths.appSrc,
                            use: [
                                {
                                    loader: require.resolve('swc-loader'),
                                    options: {
                                        jsc: {
                                            parser: {
                                                syntax: "typescript",
                                                tsx: true,
                                                decorators: true,
                                                dynamicImport: true
                                            },
                                            transform: {
                                                legacyDecorator: true,
                                                decoratorMetadata: true,
                                                react: {
                                                    runtime: "automatic",
                                                    development: isEnvDevelopment,
                                                    refresh: isEnvDevelopment && shouldUseReactRefresh
                                                }
                                            },
                                            target: "es2022",
                                            externalHelpers: true
                                        },
                                        module: {
                                            type: "es6"
                                        }
                                    }
                                }
                            ]
                        },

                        // CSS (global)
                        {
                            test: cssRegex,
                            exclude: cssModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 1,
                                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                                    modules: { mode: 'icss' }
                                }
                            ),
                            sideEffects: true
                        },
                        // CSS Modules
                        {
                            test: cssModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 1,
                                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                                    modules: {
                                        mode: 'local',
                                        getLocalIdent: getCSSModuleLocalIdent
                                    }
                                }
                            )
                        },
                        /*// SASS (global)
                        {
                            test: sassRegex,
                            exclude: sassModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                                    modules: { mode: 'icss' }
                                },
                                'sass-loader'
                            ),
                            sideEffects: true
                        },
                        // SASS Modules
                        {
                            test: sassModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                                    modules: {
                                        mode: 'local',
                                        getLocalIdent: getCSSModuleLocalIdent
                                    }
                                },
                                'sass-loader'
                            )
                        },*/
                        // Less (global)
                        {
                            test: lessRegex,
                            exclude: lessModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                                    modules: { mode: 'icss' }
                                },
                                'less-loader'
                            ),
                            sideEffects: true
                        },
                        // Less Modules
                        {
                            test: lessModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                                    modules: {
                                        mode: 'local',
                                        getLocalIdent: getCSSModuleLocalIdent
                                    }
                                },
                                'less-loader'
                            )
                        },
                        /*// Stylus (global)
                        {
                            test: stylusRegex,
                            exclude: stylusModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                                    modules: { mode: 'icss' }
                                },
                                'stylus-loader'
                            ),
                            sideEffects: true
                        },
                        // Stylus Modules
                        {
                            test: stylusModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                                    modules: {
                                        mode: 'local',
                                        getLocalIdent: getCSSModuleLocalIdent
                                    }
                                },
                                'stylus-loader'
                            )
                        },*/
                        // Fallback resource loader
                        {
                            exclude: [/^$/, /\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
                            type: 'asset/resource'
                        },
                        // WASM Babel config for specific deps
                        {
                            test: /\.m?js$/,
                            include: [path.join(paths.appNodeModules, 'tiny-secp256k1')],
                            use: {
                                loader: 'swc-loader',
                                options: {
                                    jsc: {
                                        parser: {
                                            syntax: "ecmascript",
                                            dynamicImport: true
                                        },
                                        target: "es2022"
                                    },
                                    module: {
                                        type: "es6"
                                    }
                                }
                            }
                        }
                    ]
                }
            ].filter(Boolean)
        },
        watchOptions: {
            // for some systems, watching many files can result in a lot of CPU or memory usage
            // https://webpack.js.org/configuration/watch/#watchoptionsignored
            // don't use this pattern, if you have a monorepo with linked packages
            ignored: /node_modules/,
        },
        plugins: [
            new ESLintWebpackPlugin({
                extensions: ['ts', 'tsx', 'js', 'jsx'],
                context: path.resolve(__dirname, '../src'),
                overrideConfigFile: path.resolve(__dirname, '../eslint.config.cjs'),
                failOnError: false,
                failOnWarning: false,
            }),
            // React Refresh Plugin - conditional
            isEnvDevelopment && shouldUseReactRefresh && new ReactRefreshWebpackPlugin({
                overlay: false, // Disable overlay since it won't work in extension context
                exclude: [
                    /node_modules/,
                    /background\.js/,
                    /content-script\.js/,
                    /pageProvider\.js/
                ],
                // For Chrome extensions, we need to handle the runtime differently
                esModule: true,
            }),
            // ForkTsCheckerWebpackPlugin - make it conditional for production only
            (isEnvProduction || process.env.CI) && new ForkTsCheckerWebpackPlugin({
                async: true,
                issue: {
                    exclude: [
                        { file: '**/node_modules/@btc-vision/transaction/**' }
                    ]
                },
                typescript: {
                    memoryLimit: 4096,
                    configFile: './tsconfig.json',
                    configOverwrite: {
                        compilerOptions: {
                            skipLibCheck: true,
                        },
                        exclude: ['./node_modules', '/dist/', '/build/', '/public/']
                    }
                }
            }),
            new HtmlWebpackPlugin({
                inject: true,
                template: paths.notificationHtml,
                chunks: ['ui'],
                filename: 'notification.html',
                scriptLoading: 'module'
            }),
            new HtmlWebpackPlugin({
                inject: true,
                template: paths.indexHtml,
                chunks: ['ui'],
                filename: 'index.html',
                scriptLoading: 'module'
            }),
            new HtmlWebpackPlugin({
                inject: true,
                template: paths.backgroundHtml,
                chunks: ['background'],
                filename: 'background.html',
                scriptLoading: 'module'
            }),
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process',
                dayjs: 'dayjs'
            }),
            new webpack.DefinePlugin({
                'process.env.version': JSON.stringify(`Version: ${version}`),
                'process.env.release': JSON.stringify(version),
                'process.env.manifest': JSON.stringify(manifest),
                'process.env.channel': JSON.stringify(channel)
            }),
            new MiniCssExtractPlugin({
                filename: 'static/css/[name].css',
                chunkFilename: 'static/css/[name].chunk.css'
            }),
            new WasmModuleWebpackPlugin.WebpackPlugin()
        ].filter(Boolean),
        resolve: {
            alias: {
                // Example: re-map 'moment' to 'dayjs'
                moment: require.resolve('dayjs')
            },
            plugins: [new TSConfigPathsPlugin()],
            fallback: {
                stream: require.resolve('stream-browserify'),
                crypto: require.resolve('crypto-browserify'),
                process: require.resolve('process/browser'),
                events: require.resolve('events/'),
                zlib: require.resolve('browserify-zlib'),
                http: require.resolve('stream-http'),
                https: require.resolve('https-browserify'),
                buffer: require.resolve('buffer/'),
                vm: require.resolve('vm-browserify/')
            },
            extensions: ['.js', '.jsx', '.ts', '.tsx']
        },
        stats: 'minimal',
        // If you want to re-enable code splitting, do it here:
        // optimization: { ... }
        experiments: {
            asyncWebAssembly: true,
            topLevelAwait: true,
            outputModule: true
        },
        target: 'web'
    };

    // Insert a "wasm" rule at the top of the oneOf array
    finalConfig.module.rules = finalConfig.module.rules.map((rule) => {
        if (rule.oneOf instanceof Array) {
            return {
                ...rule,
                oneOf: [
                    { test: /\.wasm$/, type: 'webassembly/async' },
                    ...rule.oneOf
                ]
            };
        }
        return rule;
    });

    return finalConfig;
};

module.exports = config;
