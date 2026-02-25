
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  export default defineConfig({
    base: '/cast-shift-app/',
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'sonner@2.0.3': 'sonner',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      rollupOptions: {
        output: {
          manualChunks: {
            xlsx: ['xlsx'],
            jszip: ['jszip'],
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  });