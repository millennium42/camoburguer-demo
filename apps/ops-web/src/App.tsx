import {
  startTransition,
  useEffect,
  useMemo,
  useState
} from "react";
import "./App.css";
import { ApiError, api, apiUrl, clearCsrfToken } from "./lib/api";
import { toast } from "sonner";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./components/ui/card";

type User = {
  id: string;
  username: string;
  role: "admin" | "operator" | "kitchen";
};

type SessionPayload = {
  user: User;
  csrfToken: string;
  expiresAt: string;
  idleExpiresAt: string;
};

type DemoAccessPayload = SessionPayload & {
  demoPrepared?: "seeded" | "preserved" | "skipped";
};

type Order = {
  id: string;
  customerName?: string | null;
  source: string;
  status: string;
  total: number;
  fulfillmentMode?: string | null;
  paymentMethod?: string | null;
  createdAt?: string;
  syncStatus?: string | null;
  tabId?: string | null;
};

type Tab = {
  id: string;
  kind: string;
  label: string;
  customerName?: string | null;
  status: string;
  total: number;
  paid: number;
  balance: number;
  balanceCents: number;
  paymentMethod?: string | null;
  rounds: Array<{ id: string; status: string; total: number }>;
  payments: Array<{ id: string; paymentMethod: string; amountCents: number; kind: string }>;
};

type InventoryBalance = {
  category: string;
  quantity: number;
};

type InventoryMovement = {
  category: string;
  delta: number;
  reason: string;
  createdAt: string;
  metadata?: { note?: string; lostQuantity?: number };
};

type InventorySnapshot = {
  balances: InventoryBalance[];
  movements: InventoryMovement[];
};

type FinanceSummary = {
  grossSales: number;
  netSales?: number;
  cancellations?: number;
  entriesByType?: Record<string, number>;
  paymentsByMethod?: Record<string, number>;
  businessTimeZone?: string;
};

type FinanceEntry = {
  id: string;
  type: string;
  label: string;
  amount: number;
  paymentMethod: string;
  occurredAt: string;
  orderId?: string | null;
  shiftId?: string | null;
};

type Shift = {
  id: string;
  status: string;
  openingAmount: number;
  expectedAmount: number;
  declaredAmount: number | null;
  differenceAmount: number | null;
  notes?: string | null;
  openedAt: string;
  closedAt: string | null;
};

type IntegrationStatus = {
  channels: {
    ifood: { enabled: boolean; nonTerminalCommands: number };
    deliverymuch: { enabled: boolean; nonTerminalCommands: number };
  };
  simulation: boolean;
};

type AuditItem = {
  id: string;
  action: string;
  resource_path: string;
  result: string;
  occurred_at: string;
  actor_id?: string | null;
  state_before?: unknown;
  state_after?: unknown;
};

type Snapshot = {
  orders: Order[];
  kitchen: Order[];
  tabs: Tab[];
  inventory: InventorySnapshot;
  financeSummary: FinanceSummary | null;
  financeEntries: FinanceEntry[];
  shifts: Shift[];
  integrations: IntegrationStatus | null;
  audit: AuditItem[];
};

type ViewId =
  | "overview"
  | "orders"
  | "kitchen"
  | "tabs"
  | "inventory"
  | "cash"
  | "finance"
  | "integrations"
  | "audit"
  | "console";

type ViewItem = {
  id: ViewId;
  label: string;
};

const EMPTY_SNAPSHOT: Snapshot = {
  orders: [],
  kitchen: [],
  tabs: [],
  inventory: { balances: [], movements: [] },
  financeSummary: null,
  financeEntries: [],
  shifts: [],
  integrations: null,
  audit: []
};

const DEFAULT_PAYMENT = { paymentMethod: "pix", amount: "" };
const DEFAULT_INVENTORY = { category: "xis", delta: "", reason: "" };
const DEFAULT_SHIFT_ADJUSTMENT = { kind: "reinforcement", amount: "", reason: "" };
const DEFAULT_NEW_TAB = { kind: "tab", label: "", customerName: "" };
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

async function loadSnapshot(role: User["role"]): Promise<Snapshot> {
  const operatorSurface = role !== "kitchen";
  const adminSurface = role === "admin";

  const [
    orders,
    kitchen,
    tabs,
    inventory,
    financeSummary,
    financeEntries,
    shifts,
    integrations,
    audit
  ] = await Promise.all([
    api<{ items: Order[] }>("/orders"),
    api<{ items: Order[] }>("/kitchen/queue"),
    operatorSurface ? api<{ items: Tab[] }>("/tabs?status=open") : Promise.resolve({ items: [] }),
    operatorSurface ? api<InventorySnapshot>("/inventory") : Promise.resolve(EMPTY_SNAPSHOT.inventory),
    operatorSurface ? api<FinanceSummary>("/finance/summary") : Promise.resolve(null),
    operatorSurface ? api<{ items: FinanceEntry[] }>("/finance/entries?limit=20") : Promise.resolve({ items: [] }),
    operatorSurface ? api<{ items: Shift[] }>("/cash-shifts") : Promise.resolve({ items: [] }),
    adminSurface ? api<IntegrationStatus>("/integrations/status") : Promise.resolve(null),
    adminSurface ? api<{ items: AuditItem[] }>("/audit?limit=20&page=1") : Promise.resolve({ items: [] })
  ]);

  return {
    orders: orders.items,
    kitchen: kitchen.items,
    tabs: tabs.items,
    inventory,
    financeSummary,
    financeEntries: financeEntries.items,
    shifts: shifts.items,
    integrations,
    audit: audit.items
  };
}

function nextKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function when(value: string | null | undefined) {
  if (!value) return "Sem horário";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Sem horário"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function statusTone(status: string) {
  if (["completed", "ready", "printed", "success"].includes(status)) return "ok";
  if (["cancelled", "dead_letter", "error", "failed"].includes(status)) return "danger";
  if (["confirmed", "in_preparation", "open", "pending", "processing", "ambiguous"].includes(status)) return "warning";
  return "neutral";
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`status-pill status-pill--${tone}`}>{label}</span>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="empty-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function App() {
  const [session, setSession] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [initializing, setInitializing] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, typeof DEFAULT_PAYMENT>>({});
  const [inventoryDraft, setInventoryDraft] = useState(DEFAULT_INVENTORY);
  const [shiftDraft, setShiftDraft] = useState(DEFAULT_SHIFT_ADJUSTMENT);
  const [openShiftAmount, setOpenShiftAmount] = useState("100");
  const [closeAmounts, setCloseAmounts] = useState<Record<string, string>>({});
  const [newTabDraft, setNewTabDraft] = useState(DEFAULT_NEW_TAB);

  const activeShift = useMemo(
    () => snapshot.shifts.find((shift) => shift.status === "open") || null,
    [snapshot.shifts]
  );

  const visibleViews = useMemo<ViewItem[]>(() => {
    if (!session) return [];
    const base: ViewItem[] = [
      { id: "overview", label: "Visão geral" },
      { id: "orders", label: "Pedidos" },
      { id: "kitchen", label: "Cozinha" },
      { id: "console", label: "Console completo" }
    ];
    if (session.role !== "kitchen") {
      base.splice(2, 0,
        { id: "tabs", label: "Comandas" },
        { id: "inventory", label: "Estoque" },
        { id: "cash", label: "Caixa" },
        { id: "finance", label: "Financeiro" }
      );
    }
    if (session.role === "admin") {
      base.splice(base.length - 1, 0,
        { id: "integrations", label: "Integrações" },
        { id: "audit", label: "Auditoria" }
      );
    }
    return base;
  }, [session]);

  function applySnapshot(next: Snapshot) {
    startTransition(() => setSnapshot(next));
    setLastUpdated(new Date().toISOString());
  }

  function handleApiError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      clearCsrfToken();
      setSession(null);
      setSnapshot(EMPTY_SNAPSHOT);
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }
    toast.error(error instanceof Error ? error.message : "Falha inesperada");
  }

  async function refreshSnapshot(silent = false, role = session?.role) {
    if (!role) return;
    if (!silent) setSnapshotLoading(true);
    try {
      applySnapshot(await loadSnapshot(role));
    } catch (error) {
      handleApiError(error);
    } finally {
      if (!silent) setSnapshotLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const payload = await api<SessionPayload>("/auth/me");
        setSession(payload.user);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          handleApiError(error);
        }
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!session) return;
    if (!visibleViews.some((view) => view.id === activeView)) {
      setActiveView("overview");
    }
  }, [activeView, session, visibleViews]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const refreshFromEffect = async (silent = false) => {
      if (cancelled) return;
      await refreshSnapshot(silent, session.role);
    };

    void refreshFromEffect();

    const intervalId = window.setInterval(() => {
      void refreshFromEffect(true);
    }, 20_000);

    const sources = [
      new EventSource(apiUrl("/events/orders"), { withCredentials: true }),
      ...(session.role === "kitchen" ? [] : [new EventSource(apiUrl("/events/finance"), { withCredentials: true })])
    ];

    for (const source of sources) {
      source.onmessage = () => {
        void refreshFromEffect(true);
      };
      source.onerror = () => {
        void refreshFromEffect(true);
      };
    }

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      for (const source of sources) {
        source.close();
      }
    };
  }, [session]);

  async function runAction(key: string, task: () => Promise<void>, successMessage: string) {
    setBusyAction(key);
    try {
      await task();
      toast.success(successMessage);
      await refreshSnapshot(true);
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLogin(username: string, password: string) {
    setBusyAction("login");
    try {
      const payload = await api<SessionPayload>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setSession(payload.user);
      toast.success(`Sessão aberta para ${payload.user.username}.`);
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusyAction(null);
      setInitializing(false);
    }
  }

  async function handleDemoAccess(role: User["role"]) {
    setBusyAction(`demo:${role}`);
    try {
      const payload = await api<DemoAccessPayload>("/demo/access", {
        method: "POST",
        body: JSON.stringify({ role, prepare: true })
      });
      setSession(payload.user);
      toast.success(
        payload.demoPrepared === "seeded"
          ? `Demo preparada e acesso liberado para ${payload.user.username}.`
          : `Acesso demo liberado para ${payload.user.username}.`
      );
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusyAction(null);
      setInitializing(false);
    }
  }

  async function handleLogout() {
    await runAction("logout", async () => {
      await api("/auth/logout", { method: "POST", body: JSON.stringify({}) });
      clearCsrfToken();
      setSession(null);
      setSnapshot(EMPTY_SNAPSHOT);
    }, "Sessão encerrada.");
  }

  async function updateOrderStatus(order: Order, status: string) {
    await runAction(`order:${order.id}:${status}`, async () => {
      await api(`/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Idempotency-Key": nextKey() },
        body: JSON.stringify({ status })
      });
    }, `Pedido ${order.id.slice(0, 8)} atualizado para ${status}.`);
  }

  async function reprintOrder(order: Order) {
    await runAction(`reprint:${order.id}`, async () => {
      await api(`/orders/${order.id}/reprint`, {
        method: "POST",
        body: JSON.stringify({})
      });
    }, `Reimpressão enviada para ${order.id.slice(0, 8)}.`);
  }

  async function openTab() {
    if (!newTabDraft.label.trim()) {
      toast.error("Informe o identificador da comanda ou mesa.");
      return;
    }
    await runAction("tabs:create", async () => {
      await api("/tabs", {
        method: "POST",
        body: JSON.stringify({
          kind: newTabDraft.kind,
          label: newTabDraft.label.trim(),
          customerName: newTabDraft.customerName.trim()
        })
      });
      setNewTabDraft(DEFAULT_NEW_TAB);
    }, "Comanda aberta.");
  }

  async function registerPayment(tab: Tab) {
    const draft = paymentDrafts[tab.id] || DEFAULT_PAYMENT;
    const amountCents = Math.round(Number(draft.amount || 0) * 100);
    if (amountCents <= 0) {
      toast.error("Informe um valor positivo para a parcela.");
      return;
    }
    await runAction(`payment:${tab.id}`, async () => {
      await api(`/tabs/${tab.id}/payments`, {
        method: "POST",
        headers: { "Idempotency-Key": nextKey() },
        body: JSON.stringify({
          paymentMethod: draft.paymentMethod,
          amountCents
        })
      });
      setPaymentDrafts((current) => ({ ...current, [tab.id]: DEFAULT_PAYMENT }));
    }, `Pagamento lançado na ${tab.kind === "table" ? "mesa" : "comanda"} ${tab.label}.`);
  }

  async function closeTab(tab: Tab) {
    await runAction(`close-tab:${tab.id}`, async () => {
      await api(`/tabs/${tab.id}/close`, {
        method: "POST",
        body: JSON.stringify({})
      });
    }, `${tab.kind === "table" ? "Mesa" : "Comanda"} ${tab.label} fechada.`);
  }

  async function adjustInventory() {
    const delta = Number(inventoryDraft.delta);
    if (!Number.isInteger(delta) || !inventoryDraft.reason.trim()) {
      toast.error("Preencha categoria, delta inteiro e motivo.");
      return;
    }
    await runAction(`inventory:${inventoryDraft.category}`, async () => {
      await api(`/inventory/${inventoryDraft.category}/adjustments`, {
        method: "POST",
        headers: { "Idempotency-Key": nextKey() },
        body: JSON.stringify({ delta, reason: inventoryDraft.reason.trim() })
      });
      setInventoryDraft(DEFAULT_INVENTORY);
    }, "Ajuste de estoque registrado.");
  }

  async function openShift() {
    const openingAmount = Number(openShiftAmount);
    if (!Number.isFinite(openingAmount) || openingAmount < 0) {
      toast.error("Informe um valor de abertura válido.");
      return;
    }
    await runAction("shift:open", async () => {
      await api("/cash-shifts/open", {
        method: "POST",
        body: JSON.stringify({ openingAmount })
      });
    }, "Caixa aberto.");
  }

  async function adjustShift() {
    if (!activeShift) {
      toast.error("Não há caixa aberto para movimentar.");
      return;
    }
    const amount = Number(shiftDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !shiftDraft.reason.trim()) {
      toast.error("Informe tipo, valor e motivo válidos.");
      return;
    }
    await runAction(`shift:adjust:${activeShift.id}`, async () => {
      await api(`/cash-shifts/${activeShift.id}/adjustments`, {
        method: "POST",
        headers: { "Idempotency-Key": nextKey() },
        body: JSON.stringify({
          kind: shiftDraft.kind,
          amount,
          reason: shiftDraft.reason.trim()
        })
      });
      setShiftDraft(DEFAULT_SHIFT_ADJUSTMENT);
    }, "Movimentação de caixa registrada.");
  }

  async function closeShift(shift: Shift) {
    const declaredAmount = Number(closeAmounts[shift.id] || "");
    if (!Number.isFinite(declaredAmount) || declaredAmount < 0) {
      toast.error("Informe o valor contado do fechamento.");
      return;
    }
    await runAction(`shift:close:${shift.id}`, async () => {
      await api(`/cash-shifts/${shift.id}/close`, {
        method: "POST",
        body: JSON.stringify({ declaredAmount })
      });
      setCloseAmounts((current) => ({ ...current, [shift.id]: "" }));
    }, "Caixa fechado.");
  }

  if (initializing) {
    return <div className="loading-screen">Carregando superfície operacional...</div>;
  }

  if (!session) {
    return (
      <LoginScreen
        busy={Boolean(busyAction)}
        busyAction={busyAction}
        demoMode={DEMO_MODE}
        onDemoAccess={handleDemoAccess}
        onLogin={handleLogin}
      />
    );
  }

  const overviewMetrics = [
    {
      label: "Pedidos ativos",
      value: snapshot.orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length.toString(),
      tone: "warning"
    },
    {
      label: "Fila da cozinha",
      value: snapshot.kitchen.length.toString(),
      tone: "warning"
    },
    {
      label: "Comandas abertas",
      value: snapshot.tabs.length.toString(),
      tone: "neutral"
    },
    {
      label: "Caixa atual",
      value: activeShift ? money(activeShift.expectedAmount) : "Fechado",
      tone: activeShift ? "ok" : "neutral"
    }
  ];

  return (
    <div className="ops-shell">
      <header className="ops-header">
        <div>
          <p className="ops-eyebrow">Camoburguer Demo</p>
          <h1>Centro operacional com sessão real, SSE e console compatível</h1>
          <p className="ops-subtitle">
            {session.role === "kitchen"
              ? "Modo cozinha: leitura e transições de preparo em tempo real."
              : "Acompanhe operação, caixa, estoque e abra o console completo quando precisar do fluxo legado integral."}
          </p>
        </div>
        <div className="ops-actions">
          <div className="session-card">
            <strong>{session.username}</strong>
            <span>{session.role}</span>
            <small>{lastUpdated ? `Atualizado em ${when(lastUpdated)}` : "Aguardando sincronização"}</small>
          </div>
          <Button variant="outline" onClick={() => void refreshSnapshot()} disabled={snapshotLoading}>
            {snapshotLoading ? "Sincronizando..." : "Atualizar"}
          </Button>
          <Button onClick={() => setActiveView("console")}>Abrir console completo</Button>
          <Button variant="secondary" onClick={() => void handleLogout()} disabled={busyAction === "logout"}>
            Sair
          </Button>
        </div>
      </header>

      <nav className="view-nav" aria-label="Áreas operacionais">
        {visibleViews.map((view) => (
          <button
            key={view.id}
            className="view-button"
            data-active={activeView === view.id}
            onClick={() => setActiveView(view.id)}
            type="button"
          >
            {view.label}
          </button>
        ))}
      </nav>

      {activeView === "overview" && (
        <section className="panel-grid">
          {overviewMetrics.map((metric) => (
            <Card key={metric.label} className="metric-card">
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className={`metric-value metric-value--${metric.tone}`}>{metric.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
          <Card className="panel-span-2">
            <CardHeader>
              <CardTitle>Eventos vivos</CardTitle>
              <CardDescription>
                A casca React escuta `/events/orders` e `/events/finance` para puxar novo snapshot do backend real.
              </CardDescription>
            </CardHeader>
            <CardContent className="event-strip">
              <StatusPill label={`${snapshot.orders.filter((order) => order.syncStatus && order.syncStatus !== "synchronized").length} syncs pendentes`} tone="warning" />
              <StatusPill label={`${snapshot.inventory.movements.length} movimentos de estoque em memória`} tone="neutral" />
              <StatusPill label={activeShift ? "Caixa em operação" : "Sem caixa aberto"} tone={activeShift ? "ok" : "neutral"} />
              {snapshot.integrations && (
                <StatusPill
                  label={`iFood ${snapshot.integrations.channels.ifood.enabled ? "ativo" : "desligado"}`}
                  tone={snapshot.integrations.channels.ifood.enabled ? "ok" : "danger"}
                />
              )}
            </CardContent>
          </Card>
          <Card className="panel-span-2">
            <CardHeader>
              <CardTitle>Atalho para amplitude total</CardTitle>
              <CardDescription>
                O console legado continua publicado em `/app/legacy/` para preservar cobertura operacional enquanto a superfície React assume sessão, visibilidade e observabilidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="quick-links">
              <Button onClick={() => setActiveView("orders")}>Ver pedidos</Button>
              {session.role !== "kitchen" && <Button variant="secondary" onClick={() => setActiveView("tabs")}>Comandas</Button>}
              {session.role !== "kitchen" && <Button variant="secondary" onClick={() => setActiveView("cash")}>Caixa</Button>}
              <Button variant="outline" onClick={() => setActiveView("console")}>Abrir console integral</Button>
            </CardContent>
          </Card>
        </section>
      )}

      {activeView === "orders" && (
        <section className="panel-stack">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos recentes</CardTitle>
              <CardDescription>
                Novo pedido, catálogo avançado e fluxo completo continuam disponíveis no console completo.
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="list-grid">
            {snapshot.orders.length === 0 && <EmptyState title="Sem pedidos" body="Assim que a API registrar novos pedidos, eles aparecem aqui." />}
            {snapshot.orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="card-row">
                    <div>
                      <CardTitle>{order.customerName || order.id.slice(0, 8)}</CardTitle>
                      <CardDescription>
                        {order.source} · {order.fulfillmentMode || "sem modalidade"} · {money(order.total)}
                      </CardDescription>
                    </div>
                    <StatusPill label={order.status} tone={statusTone(order.status)} />
                  </div>
                </CardHeader>
                <CardContent className="card-stack">
                  <div className="meta-line">
                    <span>{order.paymentMethod || "sem forma de pagamento"}</span>
                    <span>{when(order.createdAt)}</span>
                    {order.syncStatus && <span>sync: {order.syncStatus}</span>}
                  </div>
                  <div className="button-row">
                    {order.status === "confirmed" && (
                      <Button size="sm" onClick={() => void updateOrderStatus(order, "in_preparation")} disabled={busyAction === `order:${order.id}:in_preparation`}>
                        Em preparo
                      </Button>
                    )}
                    {order.status === "in_preparation" && (
                      <Button size="sm" onClick={() => void updateOrderStatus(order, "ready")} disabled={busyAction === `order:${order.id}:ready`}>
                        Pronto
                      </Button>
                    )}
                    {order.status === "ready" && session.role !== "kitchen" && (
                      <Button size="sm" onClick={() => void updateOrderStatus(order, "completed")} disabled={busyAction === `order:${order.id}:completed`}>
                        Finalizar
                      </Button>
                    )}
                    {!["completed", "cancelled"].includes(order.status) && session.role !== "kitchen" && (
                      <Button variant="secondary" size="sm" onClick={() => void updateOrderStatus(order, "cancelled")} disabled={busyAction === `order:${order.id}:cancelled`}>
                        Cancelar
                      </Button>
                    )}
                    {session.role === "admin" && (
                      <Button variant="outline" size="sm" onClick={() => void reprintOrder(order)} disabled={busyAction === `reprint:${order.id}`}>
                        Reimprimir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {activeView === "kitchen" && (
        <section className="list-grid">
          {snapshot.kitchen.length === 0 && <EmptyState title="Fila vazia" body="A cozinha recebe aqui pedidos em `confirmed`, `in_preparation` e `ready`." />}
          {snapshot.kitchen.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="card-row">
                  <div>
                    <CardTitle>{order.customerName || order.id.slice(0, 8)}</CardTitle>
                    <CardDescription>{order.source} · {money(order.total)}</CardDescription>
                  </div>
                  <StatusPill label={order.status} tone={statusTone(order.status)} />
                </div>
              </CardHeader>
              <CardContent className="button-row">
                {order.status === "confirmed" && (
                  <Button size="sm" onClick={() => void updateOrderStatus(order, "in_preparation")} disabled={busyAction === `order:${order.id}:in_preparation`}>
                    Assumir preparo
                  </Button>
                )}
                {order.status === "in_preparation" && (
                  <Button size="sm" onClick={() => void updateOrderStatus(order, "ready")} disabled={busyAction === `order:${order.id}:ready`}>
                    Marcar pronto
                  </Button>
                )}
                {order.status === "ready" && <StatusPill label="Aguardando expedição" tone="ok" />}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {activeView === "tabs" && (
        <section className="panel-stack">
          <Card>
            <CardHeader>
              <CardTitle>Abrir comanda ou mesa</CardTitle>
              <CardDescription>O fluxo completo de rodadas continua disponível no console integral.</CardDescription>
            </CardHeader>
            <CardContent className="form-grid">
              <div>
                <Label htmlFor="tab-kind">Tipo</Label>
                <select
                  id="tab-kind"
                  className="native-field"
                  value={newTabDraft.kind}
                  onChange={(event) => setNewTabDraft((current) => ({ ...current, kind: event.target.value }))}
                >
                  <option value="tab">Comanda</option>
                  <option value="table">Mesa</option>
                </select>
              </div>
              <div>
                <Label htmlFor="tab-label">Identificador</Label>
                <Input
                  id="tab-label"
                  value={newTabDraft.label}
                  onChange={(event) => setNewTabDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Ex.: 12, Mesa 5"
                />
              </div>
              <div>
                <Label htmlFor="tab-customer">Cliente</Label>
                <Input
                  id="tab-customer"
                  value={newTabDraft.customerName}
                  onChange={(event) => setNewTabDraft((current) => ({ ...current, customerName: event.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>
              <Button onClick={() => void openTab()} disabled={busyAction === "tabs:create"}>Abrir</Button>
            </CardContent>
          </Card>
          <div className="list-grid">
            {snapshot.tabs.length === 0 && <EmptyState title="Sem comandas abertas" body="As comandas publicadas pela API aparecem nesta grade." />}
            {snapshot.tabs.map((tab) => {
              const draft = paymentDrafts[tab.id] || DEFAULT_PAYMENT;
              return (
                <Card key={tab.id}>
                  <CardHeader>
                    <div className="card-row">
                      <div>
                        <CardTitle>{tab.kind === "table" ? "Mesa" : "Comanda"} {tab.label}</CardTitle>
                        <CardDescription>
                          {tab.customerName || "Sem cliente"} · {tab.rounds.length} rodada(s)
                        </CardDescription>
                      </div>
                      <StatusPill label={tab.status} tone={statusTone(tab.status)} />
                    </div>
                  </CardHeader>
                  <CardContent className="card-stack">
                    <div className="summary-grid">
                      <div><span>Total</span><strong>{money(tab.total)}</strong></div>
                      <div><span>Pago</span><strong>{money(tab.paid)}</strong></div>
                      <div><span>Saldo</span><strong>{money(tab.balance)}</strong></div>
                    </div>
                    <div className="form-grid compact-grid">
                      <div>
                        <Label>Pagamento</Label>
                        <select
                          className="native-field"
                          value={draft.paymentMethod}
                          onChange={(event) => setPaymentDrafts((current) => ({
                            ...current,
                            [tab.id]: { ...(current[tab.id] || DEFAULT_PAYMENT), paymentMethod: event.target.value }
                          }))}
                        >
                          <option value="cash">Dinheiro</option>
                          <option value="pix">Pix</option>
                          <option value="credit_card">Crédito</option>
                          <option value="debit_card">Débito</option>
                        </select>
                      </div>
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          value={draft.amount}
                          inputMode="decimal"
                          onChange={(event) => setPaymentDrafts((current) => ({
                            ...current,
                            [tab.id]: { ...(current[tab.id] || DEFAULT_PAYMENT), amount: event.target.value }
                          }))}
                          placeholder="0,00"
                        />
                      </div>
                      <Button onClick={() => void registerPayment(tab)} disabled={busyAction === `payment:${tab.id}`}>Lançar</Button>
                    </div>
                    <div className="button-row">
                      <Button
                        variant="outline"
                        onClick={() => void closeTab(tab)}
                        disabled={tab.balanceCents !== 0 || busyAction === `close-tab:${tab.id}`}
                      >
                        Fechar comanda
                      </Button>
                      <StatusPill
                        label={tab.balanceCents === 0 ? "Saldo zerado" : "Pagamento pendente"}
                        tone={tab.balanceCents === 0 ? "ok" : "warning"}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {activeView === "inventory" && (
        <section className="panel-stack">
          <Card>
            <CardHeader>
              <CardTitle>Ajuste administrativo de estoque</CardTitle>
              <CardDescription>Os saldos vêm do backend real e o ajuste exige motivo.</CardDescription>
            </CardHeader>
            <CardContent className="form-grid">
              <div>
                <Label>Categoria</Label>
                <select
                  className="native-field"
                  value={inventoryDraft.category}
                  onChange={(event) => setInventoryDraft((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="xis">Xis</option>
                  <option value="dog">Dog</option>
                  <option value="hamburguer">Hambúrguer</option>
                </select>
              </div>
              <div>
                <Label>Delta</Label>
                <Input
                  value={inventoryDraft.delta}
                  onChange={(event) => setInventoryDraft((current) => ({ ...current, delta: event.target.value }))}
                  placeholder="Ex.: 10 ou -2"
                />
              </div>
              <div>
                <Label>Motivo</Label>
                <Input
                  value={inventoryDraft.reason}
                  onChange={(event) => setInventoryDraft((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Carga, perda, contagem"
                />
              </div>
              <Button onClick={() => void adjustInventory()} disabled={busyAction === `inventory:${inventoryDraft.category}`}>Registrar</Button>
            </CardContent>
          </Card>
          <section className="panel-grid">
            <Card>
              <CardHeader>
                <CardTitle>Saldos</CardTitle>
              </CardHeader>
              <CardContent className="stack-grid">
                {snapshot.inventory.balances.map((balance) => (
                  <div key={balance.category} className="list-item">
                    <span>{balance.category}</span>
                    <strong>{balance.quantity}</strong>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="panel-span-2">
              <CardHeader>
                <CardTitle>Movimentações recentes</CardTitle>
              </CardHeader>
              <CardContent className="stack-grid">
                {snapshot.inventory.movements.slice(0, 12).map((movement, index) => (
                  <div key={`${movement.category}-${movement.createdAt}-${index}`} className="list-item list-item--spread">
                    <div>
                      <strong>{movement.category}</strong>
                      <p>{movement.reason}</p>
                    </div>
                    <div className="meta-block">
                      <StatusPill label={movement.delta > 0 ? `+${movement.delta}` : `${movement.delta}`} tone={movement.delta >= 0 ? "ok" : "warning"} />
                      <small>{when(movement.createdAt)}</small>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </section>
      )}

      {activeView === "cash" && (
        <section className="panel-stack">
          <section className="panel-grid">
            <Card>
              <CardHeader>
                <CardTitle>Caixa atual</CardTitle>
                <CardDescription>{activeShift ? "Há um turno aberto." : "Nenhum turno aberto no momento."}</CardDescription>
              </CardHeader>
              <CardContent className="card-stack">
                {activeShift ? (
                  <>
                    <div className="summary-grid">
                      <div><span>Abertura</span><strong>{money(activeShift.openingAmount)}</strong></div>
                      <div><span>Esperado</span><strong>{money(activeShift.expectedAmount)}</strong></div>
                    </div>
                    <div className="form-grid compact-grid">
                      <div>
                        <Label>Tipo</Label>
                        <select
                          className="native-field"
                          value={shiftDraft.kind}
                          onChange={(event) => setShiftDraft((current) => ({ ...current, kind: event.target.value }))}
                        >
                          <option value="reinforcement">Reforço</option>
                          <option value="withdrawal">Retirada</option>
                        </select>
                      </div>
                      <div>
                        <Label>Valor</Label>
                        <Input
                          value={shiftDraft.amount}
                          onChange={(event) => setShiftDraft((current) => ({ ...current, amount: event.target.value }))}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <Label>Motivo</Label>
                        <Input
                          value={shiftDraft.reason}
                          onChange={(event) => setShiftDraft((current) => ({ ...current, reason: event.target.value }))}
                          placeholder="Troco, sangria..."
                        />
                      </div>
                      <Button onClick={() => void adjustShift()} disabled={busyAction === `shift:adjust:${activeShift.id}`}>Lançar</Button>
                    </div>
                  </>
                ) : (
                  <div className="form-grid compact-grid">
                    <div>
                      <Label>Valor de abertura</Label>
                      <Input value={openShiftAmount} onChange={(event) => setOpenShiftAmount(event.target.value)} placeholder="100,00" />
                    </div>
                    <Button onClick={() => void openShift()} disabled={busyAction === "shift:open"}>Abrir caixa</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Fechamento</CardTitle>
              </CardHeader>
              <CardContent className="card-stack">
                {activeShift ? (
                  <>
                    <Label htmlFor={`close-${activeShift.id}`}>Valor contado</Label>
                    <Input
                      id={`close-${activeShift.id}`}
                      value={closeAmounts[activeShift.id] || ""}
                      onChange={(event) => setCloseAmounts((current) => ({ ...current, [activeShift.id]: event.target.value }))}
                      placeholder={String(activeShift.expectedAmount)}
                    />
                    <Button variant="outline" onClick={() => void closeShift(activeShift)} disabled={busyAction === `shift:close:${activeShift.id}`}>
                      Fechar turno
                    </Button>
                  </>
                ) : (
                  <p className="empty-copy">Abra um caixa para habilitar fechamento e movimentações.</p>
                )}
              </CardContent>
            </Card>
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Histórico de turnos</CardTitle>
            </CardHeader>
            <CardContent className="stack-grid">
              {snapshot.shifts.map((shift) => (
                <div key={shift.id} className="list-item list-item--spread">
                  <div>
                    <strong>{shift.id.slice(0, 8)}</strong>
                    <p>{when(shift.openedAt)} · {shift.closedAt ? `fechado em ${when(shift.closedAt)}` : "em aberto"}</p>
                  </div>
                  <div className="meta-block">
                    <StatusPill label={shift.status} tone={statusTone(shift.status)} />
                    <strong>{money(shift.expectedAmount)}</strong>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {activeView === "finance" && (
        <section className="panel-stack">
          <section className="panel-grid">
            <Card>
              <CardHeader>
                <CardDescription>Vendas brutas</CardDescription>
                <CardTitle className="metric-value metric-value--ok">{money(snapshot.financeSummary?.grossSales)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Cancelamentos</CardDescription>
                <CardTitle className="metric-value metric-value--warning">{money(snapshot.financeSummary?.cancellations)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Entradas de caixa</CardDescription>
                <CardTitle className="metric-value">{money(snapshot.financeSummary?.entriesByType?.cash_reinforcement)}</CardTitle>
              </CardHeader>
            </Card>
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Lançamentos recentes</CardTitle>
            </CardHeader>
            <CardContent className="stack-grid">
              {snapshot.financeEntries.slice(0, 20).map((entry) => (
                <div key={entry.id} className="list-item list-item--spread">
                  <div>
                    <strong>{entry.label}</strong>
                    <p>{entry.type} · {entry.paymentMethod} · {when(entry.occurredAt)}</p>
                  </div>
                  <strong>{money(entry.amount)}</strong>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {activeView === "integrations" && snapshot.integrations && (
        <section className="panel-grid">
          {Object.entries(snapshot.integrations.channels).map(([channel, details]) => (
            <Card key={channel}>
              <CardHeader>
                <CardTitle>{channel}</CardTitle>
                <CardDescription>{details.enabled ? "Adapter habilitado" : "Adapter desligado"}</CardDescription>
              </CardHeader>
              <CardContent className="card-stack">
                <StatusPill label={details.enabled ? "habilitado" : "desligado"} tone={details.enabled ? "ok" : "danger"} />
                <p className="empty-copy">{details.nonTerminalCommands} comando(s) não terminalizado(s).</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {activeView === "audit" && (
        <section className="panel-stack">
          {snapshot.audit.length === 0 && <EmptyState title="Sem auditoria carregada" body="A leitura de auditoria é exclusiva de admin e chega paginada do backend." />}
          {snapshot.audit.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="card-row">
                  <div>
                    <CardTitle>{item.action}</CardTitle>
                    <CardDescription>{item.resource_path} · {when(item.occurred_at)}</CardDescription>
                  </div>
                  <StatusPill label={item.result} tone={statusTone(item.result)} />
                </div>
              </CardHeader>
              <CardContent className="audit-grid">
                <div>
                  <Label>Antes</Label>
                  <pre>{JSON.stringify(item.state_before ?? null, null, 2)}</pre>
                </div>
                <div>
                  <Label>Depois</Label>
                  <pre>{JSON.stringify(item.state_after ?? null, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {activeView === "console" && (
        <section className="panel-stack">
          <Card>
            <CardHeader>
              <CardTitle>Console operacional completo</CardTitle>
              <CardDescription>
                Publicado em `/app/legacy/` para manter cobertura funcional integral durante a transição do shell React.
              </CardDescription>
            </CardHeader>
          </Card>
          <iframe
            className="embedded-console"
            src={apiUrl("/app/legacy/")}
            title="Console operacional legado"
          />
        </section>
      )}
    </div>
  );
}

function LoginScreen({
  busy,
  busyAction,
  demoMode,
  onDemoAccess,
  onLogin
}: {
  busy: boolean;
  busyAction: string | null;
  demoMode: boolean;
  onDemoAccess: (role: User["role"]) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  return (
    <div className="login-shell">
      <Card className="login-card">
        <CardHeader>
          <p className="ops-eyebrow">Camoburguer Demo</p>
          <CardTitle>Entrar na superfície operacional</CardTitle>
          <CardDescription>
            A sessão usa cookie `HttpOnly`, CSRF em memória e restauração via `/auth/me`.
          </CardDescription>
        </CardHeader>
        <CardContent className="card-stack">
          <div>
            <Label htmlFor="username">Usuário</Label>
            <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <Button onClick={() => void onLogin(username, password)} disabled={busy}>
            {busyAction === "login" ? "Autenticando..." : "Entrar"}
          </Button>
          {demoMode && (
            <div className="demo-access">
              <p className="demo-access__hint">
                Os atalhos abaixo preparam a base demo automaticamente no primeiro acesso.
              </p>
              <div className="demo-access__grid">
                <Button onClick={() => void onDemoAccess("admin")} disabled={busy}>
                  {busyAction === "demo:admin" ? "Abrindo..." : "Entrar como admin demo"}
                </Button>
                <Button onClick={() => void onDemoAccess("operator")} disabled={busy}>
                  {busyAction === "demo:operator" ? "Abrindo..." : "Entrar como atendimento demo"}
                </Button>
                <Button onClick={() => void onDemoAccess("kitchen")} disabled={busy}>
                  {busyAction === "demo:kitchen" ? "Abrindo..." : "Entrar como cozinha demo"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
