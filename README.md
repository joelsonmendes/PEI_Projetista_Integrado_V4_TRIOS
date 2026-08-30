# PEI ALUNOS • TRIOS V4.4

Plataforma dedicada exclusivamente aos trios de alunos da UC Projetos Elétricos Industriais.

## O que os alunos fazem nesta plataforma

1. Recebem do docente um código do trio, por exemplo `PEI-2026-ELETRO-A-T01`.
2. Formam uma empresa fictícia e cadastram os três integrantes.
3. Geram a situação-problema individual do trio.
4. Analisam e escolhem os acionamentos.
5. Realizam e registram os cálculos.
6. Dimensionam QGBT, CCM e subestação aérea Energisa até 300 kVA.
7. Desenvolvem projeto luminotécnico, SPDA, BEP e aterramento.
8. Preenchem memorial descritivo, memória de cálculo, quadro de cargas e lista de materiais.
9. Geram o PDF completo.
10. Clicam em **Gerar JSON de entrega** e enviam ao docente:
   - `ENTREGA_....json`
   - PDF final do projeto.

## Importante

Esta versão não possui área do docente e não calcula a nota final da equipe.

As verificações internas servem apenas para ajudar o trio a detectar incoerências antes da entrega.

## GitHub + Vercel

Publique esta pasta em um repositório dedicado aos alunos.

Estrutura principal:
- `index.html`
- `styles.css`
- `app.js`
- `api/`
- `assets/`
- `package.json`
- `vercel.json`

Na Vercel:
- Framework Preset: `Other`
- Build Command: vazio
- Output Directory: vazio

A função `/api/evaluate-drive` fornece somente feedback técnico de coerência dos acionamentos.
