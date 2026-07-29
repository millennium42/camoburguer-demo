# Camoburguer Design System (CDS)

O Design System da Camoburguer é focado na eficiência, usabilidade sob alta pressão (cozinha e balcão) e responsividade para dispositivos variados (tablets PDV, desktops, e celulares de entregadores/garçons). Ele evita excessos visuais e prioriza a legibilidade.

## 1. Princípios
1. **Densidade Operacional Adequada**: Interfaces densas o suficiente para reduzir rolagens na operação de caixa e cozinha, mas legíveis a distâncias curtas.
2. **Previsibilidade**: Ações primárias devem ser imediatamente óbvias, usando um sistema rígido de cores semânticas.
3. **Robustez sob Erro**: Feedback imediato e claro sobre falhas na rede, mantendo estados para retentativas seguras (indispensável em um sistema distribuído e eventualmente não confiável).
4. **WCAG 2.2 AA**: Foco visível (`focus-visible`), contraste estrito, navegação primária toda alcançável via teclado.

## 2. Cores e Tokens (Base Tailwind/Shadcn)
A paleta prioriza alto contraste. Não usamos cores estridentes sem necessidade contextual.
- **Background**: `#ffffff` (Base), `#f8fafc` (Muted/Superfície)
- **Foreground**: `#0f172a` (Primário), `#475569` (Secundário)
- **Brand/Ação Primária**: `#ea580c` (Laranja Camo) - Usado em CTAs de finalização de pedidos. Hover: `#c2410c`.
- **Ação Secundária**: `#e2e8f0` (Borda/Background) com texto `#0f172a`.
- **Destrutivo**: `#ef4444`. Hover: `#dc2626`. Usado para cancelamento e estornos.
- **Sucesso (Cozinha/Pronto)**: `#22c55e`. Usado em liberação de rodadas.

## 3. Tipografia
- **Família Font-Sans**: `Inter`, `Roboto` ou system-ui. Foco em dígitos numéricos tabulares (`tabular-nums`) para leitura de valores financeiros precisos.
- **Escala**:
  - H1: `2rem` (`32px`), Bold, Título de Painéis.
  - H2: `1.5rem` (`24px`), Semi-bold, Divisão de Seções.
  - Body: `1rem` (`16px`), Base, Leitura normal.
  - Small: `0.875rem` (`14px`), Detalhes e metadados.

## 4. Espaçamento, Densidade e Elevação
- O sistema usa a escala múltipla de `4px` (Tailwind standard).
- **Cartões (Comandas/Rodadas)**: `p-4` (`16px`) de padding interno, borda `1px` discreta (`border-slate-200`).
- **Sombras/Elevação**: Mínimas. `shadow-sm` para botões e cards interativos; `shadow-lg` exclusivamente para *Modais e Dropdowns* suspensos.

## 5. Estados
- **Hover/Active**: Escurecimento ou clareamento na ordem de 10-15% (steps do Tailwind 500 -> 600).
- **Disabled**: Redução de opacidade para `50%`, cursor `not-allowed`, remoção de contrastes.
- **Loading**: Uso de *Skeleton Loaders* para layouts pesados e Spinners em linha para ações pequenas (`<Button>`).
- **Empty States**: Ilustrações vetoriais monocromáticas ou ícones (Lucide) e mensagens centralizadas convidativas ("Nenhum pedido na fila").

## 6. Responsividade
- Quebras base: `sm: 640px` (Celulares deitados), `md: 768px` (Tablets retrato/PDV), `lg: 1024px` (Monitores operacionais).
- Em telas menores, interfaces tabulares viram listas em cartões ou escondem colunas menos críticas. O layout de balcão acomoda o carrinho à direita sempre visível em `lg`.

## 7. Motion
- Restrito ao absoluto necessário para orientação espacial do operador, usando **Framer Motion** com moderação.
- Transições de `fade-in` e `slide-in` (em modais e Toasts) variam entre `150ms` e `200ms` sem bounciness exagerado.
- Obrigatório o respeito à diretiva `prefers-reduced-motion` para anular qualquer interpolação não-imediata. Animações de loading permanecem, mas sem pulsações fortes.
