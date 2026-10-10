# Vantage

Criador de TTRPG online onde o usuário cria o próprio sistema de regras e joga nele.

Não assume sistema pronto. Campos, atributos, entidades e regras são definidos pelo usuário.

## Produto

- Criação e jogo no mesmo ambiente.
- Sistemas, fichas, NPCs, itens e regras customizados.
- Alterações no sistema refletem na mesa.
- IA auxilia criação e narração; humano decide.

## Princípios

1. **Nada é fixo** — estruturas são definidas pelo usuário.
2. **IA assistiva** — IA propõe; humano aprova.
3. **Imersão** — jogo no centro; UI discreta.

## Conceitos

- **System** — sistema de regras, entidades e campos definidos pelo usuário. Tem dono e participantes.
- **Mesa** — jogo ao vivo com participantes e histórico.
- **Cena** — contexto atual da mesa.
- **Ficha** — entidade dinâmica para PC ou NPC.
- **Estrutura** — modelo de uma categoria (ex.: Characters). Define fields e layout. Uma por categoria, compartilhada por todos os recursos dela.
- **Recurso** — item real de uma estrutura (ex.: Kael). Guarda só os valores dos fields.
- **Peça** — tipo de bloco (número, texto, tabela…).
- **Field** — peça colocada numa estrutura: tipo, label, posição no grid, opções e config. Adicionar/remover/mover afeta todos os recursos da estrutura.
- **Modo** — recurso abre em View ou Edit. View só exibe, sem editar nada. Edit altera estrutura e valores.
- **Persona** — identidade pela qual o usuário fala.
- **Rolagem** — fórmula e resultado visíveis.
- **Narração** — descrição do mundo pelo sistema/IA.
