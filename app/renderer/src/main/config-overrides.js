const {
    override,
    fixBabelImports,
    addWebpackResolve,
    addWebpackExternals,
    addWebpackPlugin,
    addWebpackAlias,
    addWebpackModuleRule,
    overrideDevServer,
    removeModuleScopePlugin,
    watchAll
} = require('customize-cra')
const path = require('path')
const ProgressBarPlugin = require('progress-bar-webpack-plugin'); // Pack Progress
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin")
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const devMode = process.env.NODE_ENV !== 'production';

const OUTPUT_PATH = path.resolve(__dirname, "..", "..", "pages", "main")

module.exports = {
    webpack: override(
        addWebpackResolve({
            fallback: {
                fs: false,
            },
        }),
        addWebpackAlias({
            '@': path.resolve(__dirname, 'src')
        }),
        // Pack Progress Bar
        addWebpackPlugin(new ProgressBarPlugin()),
        addWebpackPlugin(new MonacoWebpackPlugin({
            languages: ["json", "javascript", "go", "markdown", "html", "yaml", "java"],
        })),
        process.env.REACT_APP_ANALYZER &&
        addWebpackPlugin(new BundleAnalyzerPlugin(
            {
                analyzerPort: 3000
            }
        )),
        addWebpackPlugin(new NodePolyfillPlugin()),
        !devMode && addWebpackPlugin(new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css'
        })),
        addWebpackModuleRule(
            {
                test: [/\.css$/, /\.scss$/], // Pack SCSS Suffix/CSS File
                exclude: [/\.module\.(css|scss)/],
                use: [
                    devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
                    "css-loader",
                    "sass-loader"
                ]
            },
            {
                test: /\.module\.(css|scss)/,
                use: [
                    devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            modules: {
                                localIdentName: '[name]_[local]_[hash:base64:5]',
                            }
                        }
                    },
                    "sass-loader"
                ]
            },
            {
                test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'media/[name].[hash:8].[ext]'
                        }
                    }
                ]
            }
        ),
        fixBabelImports('import', {
            libraryName: 'antd',
            libraryDirectory: 'es',
            style: 'css'
        }),
        addWebpackExternals(
            { "./cptable": "var cptable" },
        ),
        removeModuleScopePlugin(),
        (config) => {
            if (config.mode !== 'development') {
                config.output.path = OUTPUT_PATH
                config.output.publicPath = "./"
            }
            // Remove Pack Prod Map File
            config.devtool = config.mode === 'development' ? 'cheap-module-source-map' : false;
            config.ignoreWarnings = [/Failed to parse source map/]
            // console.log('config-webpack', config)
            return config
        }
    ),
    devServer: overrideDevServer(
        config => {
            const newConfig = {
                ...config,
                hot: true,
                devMiddleware: {
                    writeToDisk: true,
                },
                client: {
                    overlay: {
                        errors: true,
                        warnings: false,
                        runtimeErrors: false,
                    },
                }
            }
            return newConfig
        },
        watchAll()
    ),
    paths: function (paths, env) {
        // Change Build Output Dir
        paths.appBuild = OUTPUT_PATH
        return paths
    }
}