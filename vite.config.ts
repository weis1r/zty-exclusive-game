import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const deployTarget = process.env.DEPLOY_TARGET
  const isAndroidBuild = command === 'build' && deployTarget === 'android'
  const isGitHubPagesBuild =
    command === 'build' &&
    typeof repoName === 'string' &&
    repoName.length > 0 &&
    (deployTarget === 'github-pages' || process.env.GITHUB_ACTIONS === 'true')

  return {
    base: isAndroidBuild ? './' : isGitHubPagesBuild ? `/${repoName}/` : '/',
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
      },
    },
  }
})
