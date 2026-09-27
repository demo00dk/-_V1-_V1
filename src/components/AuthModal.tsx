import type { FormEvent } from "react";
import { useState } from "react";
import type { Session } from "../domain/types";
import { authenticate } from "../lib/api";
import { useDialog } from "../ui/useDialog";
import { Field } from "./forms";

export function AuthModal({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: (session: Session) => void;
}) {
  const dialogRef = useDialog(onClose);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setStatus("");
    try {
      onAuthenticated(await authenticate(mode, username, password));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    } finally {
      setSending(false);
    }
  };
  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="modal-backdrop auth-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="登录或注册"
    >
      <section className="auth-card">
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <div className="auth-aside">
          <span>
            demo
            <br />
            demo
          </span>
          <p>
            韩国留学
            <br />
            一站式行动平台
          </p>
          <small>先看清信息，再决定下一步。</small>
        </div>
        <form onSubmit={submit} className="auth-form">
          <div className="auth-switch">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setStatus("");
              }}
            >
              登录
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setStatus("");
              }}
            >
              注册
            </button>
          </div>
          <p className="eyebrow">
            {mode === "login" ? "WELCOME BACK" : "CREATE YOUR ACCOUNT"}
          </p>
          <h2>
            {mode === "login"
              ? "登录后继续你的留学行程。"
              : "创建账号，开启你的留学行程。"}
          </h2>
          <p className="auth-note">
            {mode === "login"
              ? "欢迎回来，继续了解学校与申请准备。"
              : "注册完成后自动登录并返回首页。"}
          </p>
          <Field label="账号">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="字母、数字或 . _ -"
              required
            />
          </Field>
          <Field label="密码">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="至少 6 位"
              minLength={6}
              required
            />
          </Field>
          {status && (
            <p className="auth-error" role="alert">
              {status}
            </p>
          )}
          <button className="button dark full" disabled={sending}>
            {sending ? "处理中…" : mode === "login" ? "登录并继续 →" : "注册并进入首页 →"}
          </button>
          <small className="auth-tip">免费浏览院校与公开资料，无需先登录。</small>
        </form>
      </section>
    </div>
  );
}
