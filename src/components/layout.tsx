import { pages } from "../app/navigation";
import type { Page, Session, SiteData } from "../domain/types";

export function Header({
  brand,
  page,
  navigate,
  onContact,
  session,
  onAuth,
  onLogout,
}: {
  brand: string;
  page: Page;
  navigate: (page: Page) => void;
  onContact: () => void;
  session: Session | null;
  onAuth: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="site-header">
      <div className="nav-shell">
        <button className="brand" onClick={() => navigate("home")} aria-label="返回首页">
          <span className="brand-mark">D</span>
          <span>
            {brand}
            <small>韩国留学行动台</small>
          </span>
        </button>
        <nav className="primary-nav" aria-label="主导航">
          {pages.map((item) => (
            <button
              key={item.key}
              aria-current={page === item.key ? "page" : undefined}
              className={page === item.key ? "active" : ""}
              onClick={() => navigate(item.key)}
            >
              {item.text}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          {session ? (
            <>
              <span className="account-name">{session.user.username}</span>
              {session.user.role === "admin" && (
                <button className="admin-access" onClick={() => navigate("admin")}>
                  后台管理
                </button>
              )}
              <button className="text-button" onClick={onLogout}>
                退出
              </button>
            </>
          ) : (
            <button className="text-button" onClick={onAuth}>
              登录 / 注册
            </button>
          )}
          <button className="button small red" onClick={onContact}>
            找顾问聊聊
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer({
  site,
  navigate,
  session,
  onAuth,
}: {
  site: SiteData;
  navigate: (page: Page) => void;
  session: Session | null;
  onAuth: () => void;
}) {
  return (
    <footer>
      <div className="section-shell footer-grid">
        <div>
          <span className="brand-mark">D</span>
          <h2>{site.brand.name}</h2>
          <p>给中国学生的韩国留学一站式行动平台。</p>
        </div>
        <div>
          <b>开始准备</b>
          <button onClick={() => navigate("matcher")}>智能匹配</button>
          <button onClick={() => navigate("schools")}>院校库</button>
          <button onClick={() => navigate("majors")}>专业库</button>
          <button onClick={() => navigate("resources")}>公开工具</button>
        </div>
        <div>
          <b>账户服务</b>
          {session ? (
            <small>
              已登录：{session.user.username}
              <br />
              继续浏览你的留学行动单。
            </small>
          ) : (
            <>
              <button onClick={onAuth}>登录 / 注册</button>
              <small>按你的条件，继续查院校和专业。</small>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
