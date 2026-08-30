# Guia de Uso — PEI Projetista Integrado V4

## Finalidade

A avaliação é realizada por **trios**. Cada trio representa uma **empresa projetista fictícia** e desenvolve um único Projeto Elétrico Industrial.

## Preparação pelo docente

1. Forme os trios.
2. Entregue um código único a cada empresa/equipe, por exemplo:
   - PEI-2026-T01
   - PEI-2026-T02
   - PEI-2026-T03
3. Oriente o trio a utilizar sempre o mesmo código durante o projeto.
4. Cada trio deverá criar o nome de sua empresa projetista fictícia.

## Cadastro da equipe

Na etapa **Código e cliente**, o trio informa:

- razão social fictícia da empresa projetista;
- nome fantasia;
- CNPJ fictício;
- turma;
- cidade/UF;
- os três integrantes;
- número/matrícula de cada integrante;
- função de cada integrante;
- percentual de participação;
- responsabilidades específicas;
- responsável técnico didático da equipe.

A soma da participação dos três estudantes deve ser **100%**.

## Divisão de responsabilidades sugerida

A divisão é livre, mas uma organização possível é:

- Integrante 1: coordenação, demanda, QGBT e integração do projeto;
- Integrante 2: motores, Engenharia de Acionamentos e CCM;
- Integrante 3: subestação, luminotécnico, SPDA/aterramento e documentação.

Mesmo com divisão de tarefas, o projeto é responsabilidade acadêmica do trio e todos devem conhecer a solução final.

## Engenharia de Acionamentos

O código gera a carga e a condição operacional, mas **não gera a resposta do acionamento**.

O trio deve escolher entre:

- Partida Direta;
- Soft-starter;
- Inversor de Frequência.

Critério didático de Partida Direta:

- 220 V: até 5 cv;
- 380 V: até 7,5 cv.

A equipe deve justificar cada decisão com base em velocidade, processo, torque, inércia, partidas por hora e necessidade de partida suave.

## Memória de Cálculo

Antes de clicar em **Adicionar ao Memorial**, selecione o integrante responsável pelo cálculo. O PDF final registra o autor de cada cálculo.

A memória deve conter, conforme aplicável:

- corrente dos motores;
- potências ativa, aparente e reativa;
- demanda;
- transformador;
- cabos e ampacidade corrigida;
- queda de tensão;
- curto-circuito;
- QGBT;
- CCM;
- banco de capacitores;
- luminotécnico;
- aterramento e demais dimensionamentos desenvolvidos.

## Entregas obrigatórias

Ao final, o botão de projeto completo em PDF deve gerar, entre outros itens:

1. capa da empresa fictícia;
2. identificação dos três alunos e participação;
3. cliente fictício;
4. memorial descritivo;
5. memória de cálculo;
6. Engenharia de Acionamentos;
7. quadro de cargas;
8. QGBT;
9. CCM;
10. subestação;
11. luminotécnico;
12. SPDA/BEP/aterramento;
13. lista de materiais;
14. orçamento;
15. pranchas;
16. controle de revisão.

## Lista de Materiais

A equipe utiliza **Atualizar do projeto** para gerar uma lista-base a partir dos componentes já definidos. Depois complementa:

- item;
- TAG;
- descrição/especificação;
- quantidade;
- unidade;
- preço unitário;
- total;
- observação.

## Backup

O projeto é salvo no navegador. Recomenda-se exportar o JSON ao final de cada aula.

Se a equipe trocar de computador, use **Importar JSON**.

## GitHub + Vercel

Para publicar:

1. envie todo o conteúdo da pasta ao GitHub;
2. mantenha as pastas `assets/` e `api/`;
3. na Vercel, importe o repositório;
4. use `Framework Preset: Other`;
5. deixe Build Command e Output Directory vazios;
6. clique em Deploy.

Se o repositório GitHub for público, o código da função de avaliação também será público. Se quiser reduzir o acesso dos alunos à lógica de avaliação, mantenha o repositório **privado** e disponibilize aos estudantes somente a URL publicada pela Vercel.
