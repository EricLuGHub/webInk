import { defineConfig } from 'vite'
import * as path from 'path'

export default defineConfig({
    root: 'src',
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: path.resolve(__dirname, 'src/popup.html'),
                background: path.resolve(__dirname, 'src/background.ts'),
                content: path.resolve(__dirname, 'src/content-script.ts')
            },
            output: {
                entryFileNames: '[name].js'
            }
        }
    }
})
