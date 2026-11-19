import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import type { AuthClient } from "./auth";
import { createApi, type Order, type Product } from "./api";
import { SessionPage } from "./SessionPage";
import { LiveSalesPage } from "./LiveSalesPage";
import { dateTime, money, shortId, units } from "./format";
import { BrandMark, Empty, Loading, PageHead, Problem } from "./ui";
import "./style.css";

type Api = ReturnType<typeof createApi>;
const ApiContext = createContext<Api>(async () => {
  throw new Error("API no inicializada");
});
const Session = createContext<string | null>(null);
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "No fue posible conectar. Revisa los servicios locales.";

function Protected({ children }: { children: ReactNode }) {
  return useContext(Session) ? children : <Navigate to="/" replace />;
}

function useLoad<T>(path: string) {
  const api = useContext(ApiContext);
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason) => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [api, path, attempt]);
  const retry = () => {
    setError("");
    setAttempt((value) => value + 1);
  };
  return { data, error, retry };
}

function Catalog() {
  const { data: products, error, retry } = useLoad<Product[]>("/productos");
  return (
    <section className="page">
      <PageHead
        title="Catálogo"
        lead="Precios de referencia. El stock es informativo: registrar un pedido no lo reserva."
        action={<Link className="button button-primary" to="/nuevo">Nuevo pedido</Link>}
      />
      <Problem message={error} onRetry={retry} />
      {!products && !error && <Loading>Cargando productos…</Loading>}
      {products?.length === 0 && <Empty title="El catálogo no tiene productos publicados." />}
      {!!products?.length && (
        <table className="ledger ledger-catalog">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Estado</th>
              <th scope="col" className="num">Stock</th>
              <th scope="col" className="num">Precio</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <th scope="row" className="cell-title">
                  {product.nombre}
                  <span className="sub">{product.descripcion}</span>
                </th>
                <td data-label="Estado">
                  <span className={"tag " + (product.disponible ? "tag-ok" : "tag-off")}>
                    {product.disponible ? "Disponible" : "No disponible"}
                  </span>
                </td>
                <td className="num" data-label="Stock">{units(product.stock)} u.</td>
                <td className="num amount" data-label="Precio">{money(product.precio, product.moneda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const STATUS: Record<string, string> = { REGISTERED: "Registrado", REGISTRADO: "Registrado" };

function Receipt({ order }: { order: Order }) {
  return (
    <article className="receipt" aria-labelledby={"pedido-" + order.id}>
      <header className="receipt-head">
        <h2 id={"pedido-" + order.id}>
          Pedido <span className="mono">{shortId(order.id)}</span>
        </h2>
        <span className="tag tag-ok">{STATUS[order.estado] ?? order.estado}</span>
        <p className="receipt-date mono">{dateTime(order.fechaCreacion)}</p>
      </header>
      <table className="ledger ledger-receipt">
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col" className="num">Cant.</th>
            <th scope="col" className="num">Precio</th>
            <th scope="col" className="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productoId}>
              <th scope="row" className="cell-title">{item.nombre}</th>
              <td className="num mono">{item.cantidad}</td>
              <td className="num amount">{money(item.precioUnitario, order.moneda)}</td>
              <td className="num amount">{money(item.subtotal, order.moneda)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>Total {order.moneda}</th>
            <td className="num amount total">{money(order.total, order.moneda)}</td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}

function Orders({ administration = false }: { administration?: boolean }) {
  const { data: orders, error, retry } = useLoad<Order[]>(administration ? "/admin/pedidos" : "/pedidos");
  return (
    <section className="page">
      <PageHead
        title={administration ? "Pedidos del tenant" : "Mis pedidos"}
        lead={administration
          ? "Todos los pedidos del tenant, visibles para el rol Admin."
          : "Solicitudes registradas con tu cuenta. Un pedido no incluye pago ni reserva de stock."}
        action={<Link className="button button-primary" to="/nuevo">Nuevo pedido</Link>}
      />
      <Problem message={error} onRetry={retry} />
      {!orders && !error && <Loading>Cargando pedidos…</Loading>}
      {orders?.length === 0 && (administration
        ? <Empty title="No hay pedidos registrados en este tenant." />
        : <Empty title="Aún no registras pedidos."
            action={<Link className="button button-primary" to="/nuevo">Registrar el primero</Link>}>
            Elige productos y cantidades; el pedido queda aquí con su comprobante.
          </Empty>)}
      {!!orders?.length && (
        <>
          <p className="count meta">{orders.length} {orders.length === 1 ? "pedido" : "pedidos"}</p>
          <ol className="receipts">
            {orders.map((order) => (
              <li key={order.id}><Receipt order={order} /></li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function CreateOrder() {
  const { data: products, error, retry } = useLoad<Product[]>("/productos");
  const api = useContext(ApiContext),
    navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [failure, setFailure] = useState(""),
    [pending, setPending] = useState(false);
  const selected = products?.filter((p) => (quantities[p.id] ?? 0) > 0) ?? [];

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length) {
      setFailure("Elige al menos un producto.");
      return;
    }
    setPending(true);
    setFailure("");
    try {
      await api<Order>("/pedidos", {
        items: selected.map((p) => ({
          productoId: p.id,
          cantidad: quantities[p.id],
        })),
      });
      navigate("/pedidos");
    } catch (reason) {
      setFailure(errorText(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="page">
      <PageHead
        title="Nuevo pedido"
        lead="Indica la cantidad de cada producto. El total se confirma al registrar el pedido."
      />
      <Problem message={error} onRetry={retry} />
      <Problem message={failure} />
      {!products && !error && <Loading>Cargando catálogo…</Loading>}

      {products && (
        <form onSubmit={submit} className="sheet order-form">
          <table className="ledger ledger-form">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col" className="num">Precio</th>
                <th scope="col" className="num">Cantidad</th>
                <th scope="col" className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const quantity = quantities[product.id] ?? 0;
                return (
                  <tr key={product.id} className={quantity > 0 ? "is-selected" : undefined}>
                    <th scope="row" className="cell-title">
                      {product.nombre}
                      {!product.disponible && <span className="tag tag-off">No disponible</span>}
                    </th>
                    <td className="num amount" data-label="Precio">{money(product.precio, product.moneda)}</td>
                    <td className="num" data-label="Cantidad">
                      <input
                        aria-label={"Cantidad de " + product.nombre}
                        type="number"
                        min="0"
                        max="1000"
                        step="1"
                        disabled={!product.disponible || pending}
                        value={quantity}
                        onChange={(event) =>
                          setQuantities({
                            ...quantities,
                            [product.id]: Math.max(0, Number(event.target.value)),
                          })
                        }
                      />
                    </td>
                    <td className="num amount" data-label="Subtotal">
                      {quantity > 0 ? money(product.precio * quantity, product.moneda) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3}>Total estimado</th>
                <td className="num amount total">
                  {money(selected.reduce((sum, p) => sum + p.precio * quantities[p.id], 0))}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="form-foot">
            <p className="hint">Registrar un pedido no descuenta stock ni confirma una compra.</p>
            <button
              className="button button-primary"
              disabled={pending || !products || !selected.length}
            >
              {pending ? "Registrando…" : "Registrar pedido"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

const SECTIONS = [
  ["/catalogo", "Catálogo", "Productos con precio y stock de referencia."],
  ["/nuevo", "Nuevo pedido", "Cantidades por producto y total estimado antes de registrar."],
  ["/pedidos", "Mis pedidos", "Comprobante de cada pedido, con sus líneas y total."],
  ["/ventas-en-vivo", "Ventas en vivo", "Acumulados del día por producto y alertas, cada 3 s."],
] as const;

export default function App({ auth }: { auth: AuthClient }) {
  const [user, setUser] = useState(auth.user()),
    [error, setError] = useState("");
  const api = useMemo(
    () =>
      createApi(
        import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8180/api/v1",
        () => auth.token(),
      ),
    [auth],
  );

  async function session(action: "login" | "logout") {
    try {
      setError("");
      await auth[action]();
      setUser(auth.user());
    } catch (reason) {
      setError(errorText(reason));
    }
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Session value={user}>
        <ApiContext value={api}>
          {auth.mode === "local" && (
            <p className="dev-notice" role="note">
              Modo local · JWT de prueba, sin Microsoft Entra
            </p>
          )}

          <header className="site-header">
            <div className="header-row">
              <Link className="brand" to="/" aria-label="Pedidos360, inicio">
                <BrandMark />
                <span className="brand-word">
                  pedidos<span>360</span>
                </span>
              </Link>

              <nav aria-label="Principal" className="nav">
                <NavLink to="/catalogo">Catálogo</NavLink>
                <NavLink to="/pedidos">Mis pedidos</NavLink>
                <NavLink to="/ventas-en-vivo">Ventas en vivo</NavLink>
                {user && <NavLink to="/sesion">Mi sesión</NavLink>}
              </nav>

              <div className="account">
                {user && <span className="account-name">{user}</span>}
                <button
                  className="button button-small"
                  disabled={auth.mode === "unconfigured"}
                  onClick={() => session(user ? "logout" : "login")}
                >
                  {user
                    ? "Cerrar sesión"
                    : auth.mode === "local"
                      ? "Iniciar sesión local"
                      : "Iniciar sesión"}
                </button>
              </div>
            </div>
          </header>

          <main>
            <Problem message={error} />
            <Routes>
              <Route
                path="/"
                element={
                  <section className="page home">
                    <div className="home-intro">
                      <h1>Registra y sigue tus pedidos.</h1>
                      <p className="lead">
                        Consulta el catálogo, registra pedidos con varios productos y revisa el
                        comprobante de cada uno. Las ventas del día se actualizan en vivo.
                      </p>
                      <div className="actions">
                        {user ? (
                          <Link className="button button-primary" to="/catalogo">
                            Ver catálogo
                          </Link>
                        ) : (
                          <button
                            className="button button-primary"
                            disabled={auth.mode === "unconfigured"}
                            onClick={() => session("login")}
                          >
                            {auth.mode === "local"
                              ? "Entrar a la demostración"
                              : "Iniciar sesión con Microsoft"}
                          </button>
                        )}
                        {!user && auth.mode === "entra" && (
                          <span className="hint">Usa tu cuenta institucional.</span>
                        )}
                      </div>

                      {auth.mode === "unconfigured" && (
                        <p role="status" className="notice notice-warn">
                          La configuración de identidad aún no está disponible
                          para esta compilación.
                        </p>
                      )}
                    </div>

                    <ul className="home-index" aria-label="Secciones">
                      {SECTIONS.map(([path, title, text]) => (
                        <li key={path}>
                          {user ? <Link to={path}>{title}</Link> : <span className="home-index-title">{title}</span>}
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                }
              />

              <Route
                path="/catalogo"
                element={
                  <Protected>
                    <Catalog />
                  </Protected>
                }
              />
              <Route
                path="/pedidos"
                element={
                  <Protected>
                    <Orders key="own" />
                  </Protected>
                }
              />
              <Route
                path="/nuevo"
                element={
                  <Protected>
                    <CreateOrder />
                  </Protected>
                }
              />
              <Route path="/sesion" element={<Protected><SessionPage auth={auth} api={api} /></Protected>} />
              <Route path="/ventas-en-vivo" element={<Protected><LiveSalesPage api={api} /></Protected>} />
              <Route path="/administracion" element={<Protected><Orders key="admin" administration /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="site-footer">
            <span className="footer-brand">Pedidos360</span>
            <span>Un pedido registra una solicitud: no incluye pago ni reserva de stock.</span>
          </footer>
        </ApiContext>
      </Session>
    </BrowserRouter>
  );
}
