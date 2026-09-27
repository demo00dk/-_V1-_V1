import { lazy, Suspense, useEffect, useState } from "react";
import { pageFromHash } from "./app/navigation";
import { AuthModal } from "./components/AuthModal";
import { ConsultantRail, ContactModal } from "./components/consultant";
import { Footer, Header } from "./components/layout";
import type { Page, Session, SiteData } from "./domain/types";
import { getSite, readSession, signOut } from "./lib/api";
import { Home } from "./pages/Home";

const Admin = lazy(() =>
  import("./features/admin/Admin").then((module) => ({
    default: module.Admin,
  })),
);
const Schools = lazy(() =>
  import("./pages/Schools").then((module) => ({ default: module.Schools })),
);
const Majors = lazy(() =>
  import("./pages/Majors").then((module) => ({ default: module.Majors })),
);
const Matcher = lazy(() =>
  import("./pages/Matcher").then((module) => ({ default: module.Matcher })),
);
const Journey = lazy(() =>
  import("./pages/Journey").then((module) => ({ default: module.Journey })),
);
const Arrival = lazy(() =>
  import("./pages/Arrival").then((module) => ({ default: module.Arrival })),
);
const Resources = lazy(() =>
  import("./pages/Resources").then((module) => ({ default: module.Resources })),
);
const Faq = lazy(() => import("./pages/Faq").then((module) => ({ default: module.Faq })));

export function App() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [error, setError] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(readSession);

  useEffect(() => {
    getSite()
      .then(setSite)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    const onHash = () => {
      const next = pageFromHash();
      setPage(next);
      if (next === "admin")
        getSite()
          .then(setSite)
          .catch((e: Error) => setError(e.message));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (next: Page) => {
    const safePage = next === "admin" && session?.user.role !== "admin" ? "home" : next;
    window.location.hash = safePage;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    if (page === "admin" && session?.user.role !== "admin") navigate("home");
  }, [page, session]);
  const onAuthenticated = (next: Session) => {
    setSession(next);
    setAuthOpen(false);
    window.location.hash = "home";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const logout = async () => {
    try {
      await signOut(session);
    } catch {
      /* Local logout remains available while offline. */
    } finally {
      setSession(null);
      navigate("home");
    }
  };

  if (error)
    return (
      <div className="screen-message">
        <strong>内容没有加载成功。</strong>
        <button onClick={() => window.location.reload()}>重新加载</button>
        <small>{error}</small>
      </div>
    );
  if (!site)
    return (
      <div className="loading">
        <span className="loading-dot" />
        正在打开demo行动台
      </div>
    );

  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        跳到主要内容
      </a>
      {page !== "admin" && (
        <Header
          brand={site.brand.name}
          page={page}
          navigate={navigate}
          onContact={() => setContactOpen(true)}
          session={session}
          onAuth={() => setAuthOpen(true)}
          onLogout={logout}
        />
      )}
      <main id="main-content" tabIndex={-1}>
        {site.meta.distribution === "portfolio-demo" && page !== "admin" && (
          <p className="demo-notice section-shell">
            作品集演示 · 资料为历史快照 · 请勿填写真实个人信息
          </p>
        )}
        <Suspense
          fallback={
            <div className="route-loading" role="status">
              正在打开页面…
            </div>
          }
        >
          {page === "home" && (
            <Home
              site={site}
              navigate={navigate}
              onContact={() => setContactOpen(true)}
            />
          )}
          {page === "schools" && <Schools site={site} />}
          {page === "majors" && <Majors site={site} />}
          {page === "matcher" && (
            <Matcher site={site} onContact={() => setContactOpen(true)} />
          )}
          {page === "journey" && <Journey site={site} navigate={navigate} />}
          {page === "arrival" && (
            <Arrival site={site} onContact={() => setContactOpen(true)} />
          )}
          {page === "resources" && <Resources site={site} navigate={navigate} />}
          {page === "faq" && <Faq site={site} />}
          {page === "admin" && session?.user.role === "admin" && (
            <Admin site={site} setSite={setSite} navigate={navigate} />
          )}
        </Suspense>
      </main>
      {page !== "admin" && page !== "matcher" && (
        <ConsultantRail
          consultant={site.consultant}
          onContact={() => setContactOpen(true)}
        />
      )}
      {page !== "admin" && (
        <Footer
          site={site}
          navigate={navigate}
          session={session}
          onAuth={() => setAuthOpen(true)}
        />
      )}
      {contactOpen && (
        <ContactModal
          consultant={site.consultant}
          onClose={() => setContactOpen(false)}
        />
      )}
      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)} onAuthenticated={onAuthenticated} />
      )}
    </>
  );
}
