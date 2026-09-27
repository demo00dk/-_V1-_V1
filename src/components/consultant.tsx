import QRCode from "qrcode";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { SiteData } from "../domain/types";
import { createLead } from "../lib/api";
import { useDialog } from "../ui/useDialog";
import { Field } from "./forms";

export function ConsultantRail({
  consultant,
  onContact,
}: {
  consultant: SiteData["consultant"];
  onContact: () => void;
}) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(consultant.qrTarget, {
      width: 160,
      margin: 1,
      color: { dark: "#0d2848", light: "#fffdf7" },
    }).then(setQr);
  }, [consultant.qrTarget]);
  return (
    <aside className="consultant-rail">
      <span className="rail-label">留学顾问</span>
      <button onClick={onContact} aria-label="联系留学顾问">
        {qr ? <img src={qr} alt="扫码联系留学顾问" /> : <span className="qr-loading" />}
        <b>联系顾问</b>
        <small>{consultant.wechat}</small>
      </button>
    </aside>
  );
}

export function ContactModal({
  consultant,
  onClose,
}: {
  consultant: SiteData["consultant"];
  onClose: () => void;
}) {
  const dialogRef = useDialog(onClose);
  const [submitError, setSubmitError] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(consultant.qrTarget, {
      width: 200,
      margin: 1,
      color: { dark: "#0d2848", light: "#fffdf7" },
    }).then(setQr);
  }, [consultant.qrTarget]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setSending(true);
    setSubmitError("");
    try {
      await createLead({
        name: String(fd.get("name") || ""),
        contact: String(fd.get("contact") || ""),
        intent: String(fd.get("intent") || ""),
      });
      setSent(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "提交未成功，请重试或扫码联系顾问。",
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="联系留学顾问"
    >
      <div className="contact-modal">
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <div>
          <p className="eyebrow">联系 {consultant.name}</p>
          <h2>把你的情况讲清楚，方案才有用。</h2>
          <p>{consultant.note}</p>
          <img className="modal-qr" src={qr || undefined} alt="扫码联系留学顾问" />
          <b>微信号：{consultant.wechat}</b>
          <small>{consultant.availability}</small>
        </div>
        {sent ? (
          <div className="sent-state">
            <b>已收到你的信息。</b>
            <p>也可以直接扫码，获得更快回复。</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <Field label="称呼">
              <input required name="name" placeholder="怎么称呼你" />
            </Field>
            <Field label="微信 / 手机">
              <input required name="contact" placeholder="方便回复的联系方式" />
            </Field>
            <Field label="想咨询什么">
              <textarea name="intent" defaultValue="想了解韩国留学方案" rows={3} />
            </Field>
            {submitError && (
              <p className="auth-error" role="alert">
                {submitError}
              </p>
            )}
            <button disabled={sending} className="button dark full">
              {sending ? "提交中…" : "提交给顾问"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
