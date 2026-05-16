# React + TypeScript + Vite

## Integração com API monolítica

- Em desenvolvimento local, o `vite.config.ts` já faz proxy de `/auth`, `/accounts`, `/admin`, `/care` e `/procedures` para `http://localhost:3000`.
- Se preferir URL direta (produção/staging), copie `.env.example` para `.env` e defina `VITE_API_URL`.

## Variáveis de ambiente

- Desenvolvimento: `.env.development` usa `VITE_API_URL=http://localhost:3000`
- Produção (Cloud Run): defina `VITE_API_URL` com a URL pública do backend em Cloud Run

Para build em produção via CI/CD, configure:

- `VITE_API_URL` (GitHub Variables)
- `VITE_FACE_API_URL` (GitHub Variables, se aplicável)
- `VITE_TINYMCE_API_KEY` (GitHub Secret)

## Deploy no Google Cloud Run

Este repositório já está preparado para deploy automático no Cloud Run com GitHub Actions em `.github/workflows/deploy-cloud-run.yml`.

### 1. Pré-requisitos no GCP

1. Crie/provisione um projeto GCP.
2. Ative APIs:
   `Artifact Registry`, `Cloud Run`, `Cloud Build`, `IAM`, `Secret Manager`.
3. Crie um repositório Docker no Artifact Registry:
   `gcloud artifacts repositories create saudy --repository-format=docker --location=us-central1`
4. Configure Workload Identity Federation para GitHub Actions e vincule uma service account com permissões de deploy (`roles/run.admin`, `roles/artifactregistry.writer`, `roles/iam.serviceAccountUser`).

### 2. Configuração no GitHub

Adicione os secrets:

- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `VITE_TINYMCE_API_KEY`

Adicione as variables:

- `VITE_API_URL`
- `VITE_FACE_API_URL`

### 3. Deploy

1. Faça push na branch `main` (ou rode manualmente em **Actions > Deploy to Cloud Run**).
2. O workflow irá:
   - buildar a imagem Docker
   - publicar no Artifact Registry
   - fazer deploy no serviço `saudy-gestao-clinica` no Cloud Run

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
